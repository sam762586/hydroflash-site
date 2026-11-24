<?php
/**
 * HYDROFLASH — traitement du formulaire de demande (« Être rappelé » / « Demande de devis »).
 *
 * PHP 8.1+, aucune dépendance. Extensions : mbstring, fileinfo, json (standard) ; GD pour accepter une photo.
 * Configuration : fichier config-hydroflash.php HORS de la racine web (modèle : server/config.exemple.php).
 *   Emplacement : variable d'environnement HF_CONFIG, sinon ../config-hydroflash.php (dossier parent de la racine web).
 *
 * Chaîne de traitement :
 *   POST uniquement → origine du navigateur → champ piège (site_web) → limitation de débit par IP
 *   → horodatage t0 (3 s à 2 h) → validation stricte → photo (type réel, ré-encodage JPEG, sans métadonnées)
 *   → copie de secours facultative (hors racine web, purge automatique) → e-mail texte UTF-8 (mail() ou SMTP).
 * Réponse : JSON si « Accept: application/json » (public/js/hf.js) : {ok:true, redirect} / {ok:false, message} ;
 *   sinon redirection 303 vers la page de remerciement, ou page d'erreur HTML simple.
 * Les messages renvoyés sont des chaînes fixes (aucune donnée saisie) : hf.js les insère en HTML.
 *
 * Purge planifiée (facultative, tâche cron) : php /chemin/vers/envoi-demande.php purger
 */
declare(strict_types=1);

/** Types de problème acceptés : DOIT correspondre aux <option> de src/components/FormulaireDemande.astro
 *  (services.ts : typeFormulaire ?? court, puis « Autre »). Contrôlé par scripts/verifier-production.mjs (g). */
const HF_TYPES = ['Bouchon', 'Curage', 'Détartrage', 'Passage caméra', 'Pompage', 'Entretien des réseaux', 'Pompe de relevage', 'Autre'];
const HF_MIME_PHOTO = ['image/jpeg', 'image/png', 'image/webp'];

ini_set('display_errors', '0');
ini_set('log_errors', '1');
error_reporting(E_ALL);
date_default_timezone_set('Europe/Paris');
if (PHP_SAPI !== 'cli') {
    header_remove('X-Powered-By');
}

final class HfErreur extends RuntimeException
{
    public function __construct(public readonly int $statut, string $message)
    {
        parent::__construct($message);
    }
}

/* ===================================================================== Configuration */

function hf_config(): array
{
    $defauts = [
        'destinataire' => 'contact@hydroflash.fr',
        'expediteur' => '',
        'expediteur_nom' => 'Site HYDROFLASH',
        'secret' => '',
        'dossier_donnees' => '',
        'telephone_affiche' => '07 62 88 28 39',
        'telephone_lien' => 'tel:+33762882839',
        'url_merci' => '/contact/merci/',
        'hotes_autorises' => [],
        'entete_ip' => '',
        'limite_envois' => 5,
        'limite_fenetre' => 600,
        'delai_min' => 3,
        'delai_max' => 7200,
        'photo_max_octets' => 8 * 1024 * 1024,
        'photo_max_pixels' => 40_000_000,
        'photo_cote_max' => 2000,
        'photo_qualite' => 82,
        'secours_actif' => false,
        'secours_jours' => 30,
        'envoi' => 'mail',
        'mail_option_f' => true,
        'smtp' => [],
    ];
    $chemins = [];
    foreach ([$_SERVER['HF_CONFIG'] ?? null, $_SERVER['REDIRECT_HF_CONFIG'] ?? null, getenv('HF_CONFIG') ?: null] as $c) {
        if (is_string($c) && $c !== '') {
            $chemins[] = $c;
        }
    }
    $chemins[] = dirname(__DIR__) . '/config-hydroflash.php';
    foreach ($chemins as $chemin) {
        if (is_file($chemin) && is_readable($chemin)) {
            $cfg = require $chemin;
            if (!is_array($cfg)) {
                throw new RuntimeException('configuration invalide (le fichier doit retourner un tableau)');
            }
            if (hf_dans_racine_web($chemin)) {
                error_log('[hydroflash] attention : le fichier de configuration est dans la racine web ; déplacez-le au-dessus');
            }
            return hf_valider_config(array_replace($defauts, $cfg));
        }
    }
    throw new RuntimeException('configuration introuvable (HF_CONFIG ou ../config-hydroflash.php)');
}

function hf_valider_config(array $c): array
{
    foreach (['destinataire', 'expediteur'] as $k) {
        if (!is_string($c[$k]) || !filter_var($c[$k], FILTER_VALIDATE_EMAIL) || preg_match('/[\r\n<>]/', $c[$k])) {
            throw new RuntimeException("configuration : adresse « $k » invalide");
        }
    }
    if (!is_string($c['secret']) || strlen($c['secret']) < 32) {
        throw new RuntimeException('configuration : « secret » manquant ou trop court (32 caractères minimum)');
    }
    $dossier = $c['dossier_donnees'];
    if (!is_string($dossier) || $dossier === '' || $dossier[0] !== '/') {
        throw new RuntimeException('configuration : « dossier_donnees » doit être un chemin absolu');
    }
    if (hf_dans_racine_web($dossier)) {
        throw new RuntimeException('configuration : « dossier_donnees » ne doit pas être dans la racine web');
    }
    hf_dossier($dossier);
    $c['dossier_donnees'] = rtrim($dossier, '/');
    $c['expediteur_nom'] = preg_replace('/[^\p{L}\p{N} .\'-]/u', '', (string) $c['expediteur_nom']) ?: 'Site HYDROFLASH';
    if (!preg_match('/^tel:\+?[0-9]{6,15}$/', (string) $c['telephone_lien'])) {
        throw new RuntimeException('configuration : « telephone_lien » invalide');
    }
    if (!preg_match('#^/[A-Za-z0-9/_-]*$#', (string) $c['url_merci'])) {
        throw new RuntimeException('configuration : « url_merci » doit être un chemin du site (ex. /contact/merci/)');
    }
    foreach (['limite_envois', 'limite_fenetre', 'delai_min', 'delai_max', 'photo_max_octets', 'photo_max_pixels', 'photo_cote_max', 'photo_qualite', 'secours_jours'] as $k) {
        if (!is_int($c[$k]) || $c[$k] < 1) {
            throw new RuntimeException("configuration : « $k » doit être un entier positif");
        }
    }
    if (!in_array($c['envoi'], ['mail', 'smtp'], true)) {
        throw new RuntimeException('configuration : « envoi » doit valoir mail ou smtp');
    }
    if ($c['envoi'] === 'smtp') {
        $s = $c['smtp'] + ['port' => 587, 'securite' => 'starttls', 'utilisateur' => '', 'mot_de_passe' => '', 'delai' => 15, 'cafile' => null];
        if (!is_string($s['hote'] ?? null) || !preg_match('/^[A-Za-z0-9.-]+$/', $s['hote'])) {
            throw new RuntimeException('configuration : « smtp.hote » invalide');
        }
        if (!in_array($s['securite'], ['starttls', 'ssl'], true)) {
            throw new RuntimeException('configuration : « smtp.securite » doit valoir starttls ou ssl (jamais de SMTP non chiffré)');
        }
        $c['smtp'] = $s;
    }
    if (!is_array($c['hotes_autorises'])) {
        $c['hotes_autorises'] = [];
    }
    return $c;
}

/** Vrai si $chemin (existant ou non) est situé dans la racine web (DOCUMENT_ROOT). */
function hf_dans_racine_web(string $chemin): bool
{
    $racine = $_SERVER['DOCUMENT_ROOT'] ?? '';
    while (!file_exists($chemin) && dirname($chemin) !== $chemin) {
        $chemin = dirname($chemin); // plus proche dossier parent existant
    }
    if ($racine === '' || ($r = realpath($racine)) === false || ($p = realpath($chemin)) === false) {
        return false;
    }
    return $p === $r || str_starts_with($p, rtrim($r, '/') . '/');
}

/** Crée un dossier privé (0700) et y dépose un .htaccess de refus, par précaution. */
function hf_dossier(string $dossier): void
{
    if (!is_dir($dossier) && !@mkdir($dossier, 0700, true) && !is_dir($dossier)) {
        throw new RuntimeException('impossible de créer le dossier de données');
    }
    $h = $dossier . '/.htaccess';
    if (!is_file($h)) {
        @file_put_contents($h, "Require all denied\n");
    }
}

/* ===================================================================== Réponses */

function hf_veut_json(): bool
{
    return str_contains(strtolower((string) ($_SERVER['HTTP_ACCEPT'] ?? '')), 'application/json');
}

function hf_entetes_communs(): void
{
    header('Cache-Control: no-store');
    header('X-Robots-Tag: noindex, nofollow');
    header('X-Content-Type-Options: nosniff');
}

function hf_succes(string $redirection): never
{
    hf_entetes_communs();
    if (hf_veut_json()) {
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['ok' => true, 'redirect' => $redirection], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    } else {
        header('Location: ' . $redirection, true, 303);
    }
    exit;
}

/** $message : chaîne FIXE (HTML autorisé, jamais de donnée saisie). */
function hf_echec(int $statut, string $message, array $cfg = [], string $retour = '/contact/'): never
{
    $num = $cfg['telephone_affiche'] ?? '07 62 88 28 39';
    $lien = $cfg['telephone_lien'] ?? 'tel:+33762882839';
    http_response_code($statut);
    hf_entetes_communs();
    if ($statut === 405) {
        header('Allow: POST');
    }
    if (hf_veut_json()) {
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['ok' => false, 'message' => $message], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        exit;
    }
    header('Content-Type: text/html; charset=utf-8');
    $h = static fn (string $t): string => htmlspecialchars($t, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    echo '<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">'
        . '<meta name="robots" content="noindex"><title>Demande non envoyée | HYDROFLASH</title>'
        . '<style>body{margin:0;background:#F2F3F5;color:#14161A;font:18px/1.55 Arial,sans-serif}main{max-width:36em;margin:8vh auto;padding:24px}'
        . 'h1{font-size:30px;line-height:1.1;margin:0 0 16px}a{color:#C2470A;font-weight:700}.btn{display:inline-block;margin:18px 0 8px;padding:14px 22px;border-radius:999px;background:#F26A1B;color:#14161A;text-decoration:none}</style>'
        . '</head><body><main><h1>Votre demande n\'a pas été envoyée</h1><p>' . $message . '</p>'
        . '<p><a class="btn" href="' . $h($lien) . '">Appeler le ' . $h($num) . '</a></p>'
        . '<p><a href="' . $h($retour) . '">Revenir au formulaire</a></p></main></body></html>';
    exit;
}

/* ===================================================================== Validation */

/** Nettoie un texte saisi : UTF-8 valide, NFC, sans caractères de contrôle ni de mise en forme bidirectionnelle. */
function hf_texte(mixed $valeur, bool $multiligne): string
{
    if (!is_string($valeur)) {
        return '';
    }
    if (!mb_check_encoding($valeur, 'UTF-8')) {
        $valeur = mb_convert_encoding($valeur, 'UTF-8', 'UTF-8');
    }
    if (class_exists('Normalizer')) {
        $valeur = Normalizer::normalize($valeur, Normalizer::FORM_C) ?: $valeur;
    }
    $valeur = str_replace(["\r\n", "\r"], "\n", $valeur);
    $valeur = (string) preg_replace('/[\x{200B}-\x{200F}\x{202A}-\x{202E}\x{2028}\x{2029}\x{2066}-\x{2069}\x{FEFF}]/u', '', $valeur);
    if ($multiligne) {
        $valeur = (string) preg_replace('/(?![\n\t])\p{Cc}/u', '', $valeur);
        $valeur = (string) preg_replace('/[ \t]+$/mu', '', $valeur);
        $valeur = (string) preg_replace("/\n{3,}/", "\n\n", $valeur);
    } else {
        $valeur = (string) preg_replace('/\p{Cc}/u', ' ', $valeur);
        $valeur = (string) preg_replace('/\s+/u', ' ', $valeur);
    }
    return trim($valeur);
}

/** Téléphone français : renvoie ['affiche' => '06 12 34 56 78', 'e164' => '+33612345678'] ou null. */
function hf_telephone(string $brut): ?array
{
    $t = (string) preg_replace('/[\s.\-()\x{00A0}\x{202F}]/u', '', $brut);
    $t = (string) preg_replace('/^(\+33|0033)0/', '$1', $t); // « +33 (0)6… »
    if (!preg_match('/^(?:\+33|0033|0)([1-9]\d{8})$/', $t, $m)) {
        return null;
    }
    return ['affiche' => trim(chunk_split('0' . $m[1], 2, ' ')), 'e164' => '+33' . $m[1]];
}

/** Valide la demande. Lève HfErreur(422) avec un message fixe au premier problème. */
function hf_valider(array $post): array
{
    $nom = hf_texte($post['nom'] ?? '', false);
    if ($nom === '') {
        throw new HfErreur(422, 'Merci d\'indiquer votre nom.');
    }
    if (mb_strlen($nom) > 80 || preg_match('#https?://|www\.|[<>]#i', $nom)) {
        throw new HfErreur(422, 'Merci d\'indiquer un nom valide (80 caractères maximum).');
    }
    $tel = hf_telephone(hf_texte($post['tel'] ?? '', false));
    if ($tel === null) {
        throw new HfErreur(422, 'Merci d\'indiquer un numéro de téléphone valide (ex. 06 12 34 56 78).');
    }
    $cp = (string) preg_replace('/\s+/', '', hf_texte($post['cp'] ?? '', false));
    if ($cp !== '' && !preg_match('/^\d{5}$/', $cp)) {
        throw new HfErreur(422, 'Le code postal doit comporter 5 chiffres (ex. 76000).');
    }
    $type = hf_texte($post['type'] ?? '', false);
    $types = array_map(static fn ($t) => class_exists('Normalizer') ? (Normalizer::normalize($t, Normalizer::FORM_C) ?: $t) : $t, HF_TYPES);
    if ($type !== '' && !in_array($type, $types, true)) {
        throw new HfErreur(422, 'Merci de choisir le type de problème dans la liste proposée.');
    }
    $message = hf_texte($post['message'] ?? '', true);
    if (mb_strlen($message) > 2000) {
        throw new HfErreur(422, 'Votre message ne doit pas dépasser 2&nbsp;000 caractères.');
    }
    $origine = is_string($post['origine'] ?? null) && preg_match('#^/[A-Za-z0-9/_-]{0,120}$#', $post['origine']) ? $post['origine'] : '/';
    return [
        'nom' => $nom,
        'tel' => $tel,
        'cp' => $cp,
        'type' => $type !== '' ? $type : 'Non précisé',
        'message' => $message,
        'origine' => $origine,
        'urgent' => str_starts_with($origine, '/urgence'),
    ];
}

/* ===================================================================== Anti-abus */

/** Limitation de débit : $poids envois comptés par empreinte d'IP sur la fenêtre. Fichiers hors racine web. */
function hf_limiter(array $cfg, string $ip, int $poids): bool
{
    $dossier = $cfg['dossier_donnees'] . '/limites';
    $maintenant = time();
    try {
        hf_dossier($dossier);
        hf_purger_dossier($dossier, $cfg['limite_fenetre']);
        $cle = substr(hash_hmac('sha256', $ip, $cfg['secret']), 0, 40);
        $fp = fopen($dossier . '/' . $cle . '.json', 'c+');
        if ($fp === false) {
            throw new RuntimeException('ouverture impossible');
        }
        try {
            flock($fp, LOCK_EX);
            $liste = json_decode((string) stream_get_contents($fp), true);
            $liste = array_values(array_filter(is_array($liste) ? $liste : [], static fn ($t) => is_int($t) && $t > $maintenant - $cfg['limite_fenetre']));
            $autorise = count($liste) + $poids <= $cfg['limite_envois'];
            if ($autorise) {
                array_push($liste, ...array_fill(0, $poids, $maintenant));
            }
            ftruncate($fp, 0);
            rewind($fp);
            fwrite($fp, json_encode($liste));
            fflush($fp);
            flock($fp, LOCK_UN);
        } finally {
            fclose($fp);
        }
        return $autorise;
    } catch (Throwable $e) {
        // En cas de panne du disque, on ne bloque pas un client réel (le piège et t0 restent actifs).
        error_log('[hydroflash] limitation de débit indisponible : ' . $e->getMessage());
        return true;
    }
}

/** Adresse IP du visiteur : REMOTE_ADDR, ou dernière adresse de l'en-tête ajouté par le proxy de l'hébergeur
 *  (option « entete_ip », ex. HTTP_X_FORWARDED_FOR) — à n'activer que si l'hébergeur place un proxy devant le site. */
function hf_ip(array $cfg): string
{
    $entete = (string) $cfg['entete_ip'];
    if ($entete !== '' && isset($_SERVER[$entete])) {
        foreach (array_reverse(array_map('trim', explode(',', (string) $_SERVER[$entete]))) as $ip) {
            if (filter_var($ip, FILTER_VALIDATE_IP)) {
                return $ip;
            }
        }
    }
    return (string) ($_SERVER['REMOTE_ADDR'] ?? '');
}

/** Supprime les fichiers .json d'un dossier plus anciens que $ageMax secondes. */
function hf_purger_dossier(string $dossier, int $ageMax): void
{
    $limite = time() - $ageMax;
    foreach (glob($dossier . '/*.json') ?: [] as $f) {
        if (@filemtime($f) < $limite) {
            @unlink($f);
        }
    }
}

/* ===================================================================== Photo */

/**
 * Photo facultative : taille ≤ photo_max_octets, type réel vérifié (finfo + getimagesize), décodée puis
 * ré-encodée en JPEG avec GD (supprime métadonnées et contenu parasite), orientation EXIF appliquée,
 * redimensionnée (côté max photo_cote_max). Jamais écrite dans la racine web. Renvoie null si aucune photo.
 */
function hf_photo(array $cfg): ?array
{
    $f = $_FILES['photo'] ?? null;
    if (!is_array($f) || !isset($f['error'])) {
        return null;
    }
    if (is_array($f['error'])) {
        throw new HfErreur(422, 'Une seule photo peut être jointe à la demande.');
    }
    $mo = intdiv($cfg['photo_max_octets'], 1024 * 1024);
    switch ($f['error']) {
        case UPLOAD_ERR_NO_FILE:
            return null;
        case UPLOAD_ERR_OK:
            break;
        case UPLOAD_ERR_INI_SIZE:
        case UPLOAD_ERR_FORM_SIZE:
            throw new HfErreur(413, "La photo dépasse $mo&nbsp;Mo. Choisissez une image plus légère, ou envoyez votre demande sans photo.");
        default:
            throw new HfErreur(422, 'La photo n\'a pas pu être reçue. Réessayez, ou envoyez votre demande sans photo.');
    }
    $tmp = (string) $f['tmp_name'];
    if (!is_uploaded_file($tmp)) {
        throw new HfErreur(400, 'La photo n\'a pas pu être reçue. Réessayez, ou envoyez votre demande sans photo.');
    }
    $taille = filesize($tmp);
    if ($taille === false || $taille === 0) {
        throw new HfErreur(422, 'La photo est vide ou illisible. Choisissez une autre image, ou envoyez votre demande sans photo.');
    }
    if ($taille > $cfg['photo_max_octets']) {
        throw new HfErreur(413, "La photo dépasse $mo&nbsp;Mo. Choisissez une image plus légère, ou envoyez votre demande sans photo.");
    }
    $mime = (new finfo(FILEINFO_MIME_TYPE))->file($tmp) ?: '';
    if (in_array($mime, ['image/heic', 'image/heif', 'image/heic-sequence', 'image/heif-sequence'], true)) {
        throw new HfErreur(415, 'Les photos au format HEIC ne sont pas acceptées. Choisissez une photo JPEG ou PNG (sur iPhone : Réglages &gt; Appareil photo &gt; Formats &gt; « Le plus compatible »), ou envoyez votre demande sans photo.');
    }
    $info = @getimagesize($tmp);
    if (!in_array($mime, HF_MIME_PHOTO, true) || $info === false || ($info['mime'] ?? '') !== $mime) {
        throw new HfErreur(415, 'Format de photo non pris en charge : utilisez une image JPEG, PNG ou WebP, ou envoyez votre demande sans photo.');
    }
    [$l, $h] = $info;
    if ($l < 1 || $h < 1 || $l * $h > $cfg['photo_max_pixels']) {
        throw new HfErreur(413, 'Les dimensions de la photo sont trop grandes. Choisissez une image plus petite, ou envoyez votre demande sans photo.');
    }
    $gd = ['image/jpeg' => ['imagecreatefromjpeg', IMG_JPG], 'image/png' => ['imagecreatefrompng', IMG_PNG], 'image/webp' => ['imagecreatefromwebp', IMG_WEBP]][$mime];
    if (!function_exists('imagejpeg') || !function_exists($gd[0]) || !(imagetypes() & $gd[1])) {
        error_log('[hydroflash] GD indisponible (ou format non pris en charge) : photo refusée');
        throw new HfErreur(415, 'Le serveur ne peut pas traiter cette photo pour le moment. Envoyez votre demande sans photo : nous pourrons vous la demander ensuite.');
    }
    // Mémoire : environ 5 octets par pixel (image source + copie), plus une marge.
    $besoin = (int) ($l * $h * 5 + 32 * 1024 * 1024);
    $limite = hf_octets((string) ini_get('memory_limit'));
    if ($limite > 0 && $limite < memory_get_usage() + $besoin) {
        @ini_set('memory_limit', (string) (memory_get_usage() + $besoin));
    }
    $src = @$gd[0]($tmp);
    if (!$src instanceof GdImage) {
        throw new HfErreur(415, 'La photo n\'a pas pu être lue. Choisissez une autre image, ou envoyez votre demande sans photo.');
    }
    if ($mime === 'image/jpeg' && function_exists('exif_read_data')) {
        $exif = @exif_read_data($tmp);
        $src = hf_orienter($src, is_array($exif) ? (int) ($exif['Orientation'] ?? 1) : 1);
    }
    $l = imagesx($src);
    $h = imagesy($src);
    $echelle = min(1, $cfg['photo_cote_max'] / max($l, $h));
    $nl = max(1, (int) round($l * $echelle));
    $nh = max(1, (int) round($h * $echelle));
    $dst = imagecreatetruecolor($nl, $nh);
    imagefill($dst, 0, 0, (int) imagecolorallocate($dst, 255, 255, 255)); // fond blanc pour la transparence
    imagecopyresampled($dst, $src, 0, 0, 0, 0, $nl, $nh, $l, $h);
    ob_start();
    $ok = imagejpeg($dst, null, min(95, $cfg['photo_qualite']));
    $jpeg = (string) ob_get_clean();
    if (!$ok || $jpeg === '') {
        throw new HfErreur(500, 'La photo n\'a pas pu être traitée. Envoyez votre demande sans photo : nous pourrons vous la demander ensuite.');
    }
    @unlink($tmp);
    return ['donnees' => $jpeg, 'octets' => strlen($jpeg), 'largeur' => $nl, 'hauteur' => $nh];
}

function hf_orienter(GdImage $img, int $o): GdImage
{
    switch ($o) {
        case 2: imageflip($img, IMG_FLIP_HORIZONTAL); return $img;
        case 3: return imagerotate($img, 180, 0) ?: $img;
        case 4: imageflip($img, IMG_FLIP_VERTICAL); return $img;
        case 5: imageflip($img, IMG_FLIP_VERTICAL); return imagerotate($img, -90, 0) ?: $img;
        case 6: return imagerotate($img, -90, 0) ?: $img;
        case 7: imageflip($img, IMG_FLIP_HORIZONTAL); return imagerotate($img, -90, 0) ?: $img;
        case 8: return imagerotate($img, 90, 0) ?: $img;
        default: return $img;
    }
}

function hf_octets(string $v): int
{
    $v = trim($v);
    if ($v === '' || $v === '-1') {
        return -1;
    }
    $n = (int) $v;
    return match (strtolower(substr($v, -1))) { 'g' => $n << 30, 'm' => $n << 20, 'k' => $n << 10, default => $n };
}

/* ===================================================================== E-mail */

/** En-tête encodé RFC 2047 (UTF-8, base64), découpé en mots de 75 caractères maximum. */
function hf_entete_utf8(string $texte): string
{
    $texte = (string) preg_replace('/[\r\n]+/', ' ', $texte);
    if (!preg_match('/[^\x20-\x7E]/', $texte)) {
        return $texte;
    }
    $mots = [];
    $morceau = '';
    foreach (mb_str_split($texte) as $car) {
        if (strlen($morceau . $car) > 45) {
            $mots[] = '=?UTF-8?B?' . base64_encode($morceau) . '?=';
            $morceau = '';
        }
        $morceau .= $car;
    }
    if ($morceau !== '') {
        $mots[] = '=?UTF-8?B?' . base64_encode($morceau) . '?=';
    }
    return implode("\r\n ", $mots);
}

/** Construit le message : [sujet encodé, en-têtes (sans To ni Subject), corps MIME]. */
function hf_message(array $cfg, array $d, ?array $photo): array
{
    $sujet = sprintf('[Demande] %s – %s – %s', $d['type'], $d['cp'] !== '' ? $d['cp'] : 'CP non précisé', $d['urgent'] ? 'Urgent' : 'standard');
    $lignes = [
        'Nouvelle demande envoyée depuis le site HYDROFLASH.',
        '',
        'Nom : ' . $d['nom'],
        'Téléphone : ' . $d['tel']['affiche'] . ' (' . $d['tel']['e164'] . ')',
        'Code postal : ' . ($d['cp'] !== '' ? $d['cp'] : 'non précisé'),
        'Type de problème : ' . $d['type'],
        'Priorité : ' . ($d['urgent'] ? 'URGENT (formulaire de la page urgence)' : 'standard'),
        'Page d\'origine : ' . $d['origine'],
        'Reçue le : ' . date('d/m/Y à H:i'),
        '',
        'Message :',
        $d['message'] !== '' ? $d['message'] : '(aucun)',
        '',
        'Photo : ' . ($photo ? sprintf('jointe (photo-demande.jpg, %d × %d px, %s Ko, métadonnées supprimées)', $photo['largeur'], $photo['hauteur'], number_format($photo['octets'] / 1024, 0, ',', ' ')) : 'aucune'),
        '',
        '—',
        'Message automatique du formulaire du site. Aucune adresse e-mail n\'est demandée au client :',
        'rappelez-le par téléphone. Ne pas répondre à ce message.',
    ];
    $texte = implode("\r\n", $lignes) . "\r\n";
    $domaine = substr(strrchr($cfg['expediteur'], '@') ?: '@localhost', 1);
    $entetes = [
        'From' => hf_entete_utf8($cfg['expediteur_nom']) . ' <' . $cfg['expediteur'] . '>',
        'Date' => date(DATE_RFC2822),
        'Message-ID' => '<' . bin2hex(random_bytes(16)) . '@' . $domaine . '>',
        'MIME-Version' => '1.0',
        'Auto-Submitted' => 'auto-generated',
    ];
    $texteB64 = rtrim(chunk_split(base64_encode($texte), 76, "\r\n"));
    if ($photo === null) {
        $entetes['Content-Type'] = 'text/plain; charset=utf-8';
        $entetes['Content-Transfer-Encoding'] = 'base64';
        $corps = $texteB64 . "\r\n";
    } else {
        $frontiere = 'hf-' . bin2hex(random_bytes(12));
        $entetes['Content-Type'] = 'multipart/mixed; boundary="' . $frontiere . '"';
        $corps = "Ce message est au format MIME.\r\n\r\n"
            . "--$frontiere\r\nContent-Type: text/plain; charset=utf-8\r\nContent-Transfer-Encoding: base64\r\n\r\n" . $texteB64 . "\r\n"
            . "--$frontiere\r\nContent-Type: image/jpeg; name=\"photo-demande.jpg\"\r\nContent-Transfer-Encoding: base64\r\nContent-Disposition: attachment; filename=\"photo-demande.jpg\"\r\n\r\n"
            . rtrim(chunk_split(base64_encode($photo['donnees']), 76, "\r\n")) . "\r\n"
            . "--$frontiere--\r\n";
    }
    return [hf_entete_utf8($sujet), $entetes, $corps];
}

/** Envoi : mail() (MTA de l'hébergeur) ou SMTP authentifié. Lève une exception en cas d'échec. */
function hf_envoyer(array $cfg, string $sujet, array $entetes, string $corps): void
{
    foreach ($entetes as $k => $v) {
        if (preg_match('/[\r\n](?! )/', (string) $v)) { // seules les lignes de continuation « CRLF + espace » sont admises
            throw new RuntimeException("en-tête $k invalide");
        }
    }
    if ($cfg['envoi'] === 'smtp') {
        $brut = '';
        foreach (['To' => $cfg['destinataire'], 'Subject' => $sujet] + $entetes as $k => $v) {
            $brut .= $k . ': ' . $v . "\r\n";
        }
        (new HfSmtp($cfg['smtp'], substr(strrchr($cfg['expediteur'], '@') ?: '@localhost', 1)))
            ->envoyer($cfg['expediteur'], $cfg['destinataire'], $brut . "\r\n" . $corps);
        return;
    }
    $parametres = $cfg['mail_option_f'] ? '-f' . $cfg['expediteur'] : '';
    if (!mail($cfg['destinataire'], $sujet, $corps, $entetes, $parametres)) {
        throw new RuntimeException('mail() a renvoyé false');
    }
}

/**
 * Client SMTP minimal : TLS implicite (port 465, « ssl ») ou STARTTLS (port 587), certificat vérifié,
 * TLS 1.2 minimum, AUTH LOGIN (ou PLAIN), un seul destinataire. Aucune donnée d'authentification journalisée.
 */
final class HfSmtp
{
    /** @var resource|null */
    private $flux = null;

    public function __construct(private readonly array $c, private readonly string $ehlo)
    {
    }

    public function envoyer(string $de, string $a, string $donnees): void
    {
        $delai = (int) ($this->c['delai'] ?? 15);
        $crypto = STREAM_CRYPTO_METHOD_TLSv1_2_CLIENT | (defined('STREAM_CRYPTO_METHOD_TLSv1_3_CLIENT') ? STREAM_CRYPTO_METHOD_TLSv1_3_CLIENT : 0);
        $ssl = ['peer_name' => $this->c['hote'], 'verify_peer' => true, 'verify_peer_name' => true, 'allow_self_signed' => false,
            'SNI_enabled' => true, 'disable_compression' => true, 'crypto_method' => $crypto];
        if (!empty($this->c['cafile'])) {
            $ssl['cafile'] = (string) $this->c['cafile'];
        }
        $cible = ($this->c['securite'] === 'ssl' ? 'ssl://' : 'tcp://') . $this->c['hote'] . ':' . (int) $this->c['port'];
        $flux = @stream_socket_client($cible, $errno, $errstr, $delai, STREAM_CLIENT_CONNECT, stream_context_create(['ssl' => $ssl]));
        if ($flux === false) {
            throw new RuntimeException("SMTP : connexion impossible ($errno)");
        }
        $this->flux = $flux;
        stream_set_timeout($flux, $delai);
        try {
            $this->attendre([220]);
            $capacites = $this->commande('EHLO ' . $this->ehlo, [250]);
            if ($this->c['securite'] === 'starttls') {
                if (!preg_match('/^250[ -]STARTTLS\b/mi', $capacites)) {
                    throw new RuntimeException('SMTP : STARTTLS non proposé par le serveur');
                }
                $this->commande('STARTTLS', [220]);
                if (stream_socket_enable_crypto($flux, true, $crypto) !== true) {
                    throw new RuntimeException('SMTP : négociation TLS impossible');
                }
                $capacites = $this->commande('EHLO ' . $this->ehlo, [250]);
            }
            $u = (string) ($this->c['utilisateur'] ?? '');
            $p = (string) ($this->c['mot_de_passe'] ?? '');
            if ($u !== '') {
                if (preg_match('/^250[ -]AUTH\b[^\r\n]*\bLOGIN\b/mi', $capacites)) {
                    $this->commande('AUTH LOGIN', [334]);
                    $this->commande(base64_encode($u), [334], true);
                    $this->commande(base64_encode($p), [235], true);
                } elseif (preg_match('/^250[ -]AUTH\b[^\r\n]*\bPLAIN\b/mi', $capacites)) {
                    $this->commande('AUTH PLAIN ' . base64_encode("\0" . $u . "\0" . $p), [235], true);
                } else {
                    throw new RuntimeException('SMTP : aucune méthode d\'authentification compatible (LOGIN/PLAIN)');
                }
            }
            $this->commande('MAIL FROM:<' . $de . '>', [250]);
            $this->commande('RCPT TO:<' . $a . '>', [250, 251]);
            $this->commande('DATA', [354]);
            $donnees = str_replace(["\r\n", "\r"], "\n", $donnees);
            $donnees = (string) preg_replace('/^\./m', '..', $donnees); // « dot-stuffing »
            $this->ecrire(str_replace("\n", "\r\n", rtrim($donnees, "\n")) . "\r\n.\r\n");
            $this->attendre([250]);
            try {
                $this->commande('QUIT', [221]);
            } catch (Throwable) {
                // message déjà accepté : une erreur sur QUIT est sans conséquence
            }
        } finally {
            fclose($flux);
            $this->flux = null;
        }
    }

    private function commande(string $ligne, array $codes, bool $secret = false): string
    {
        $this->ecrire($ligne . "\r\n");
        return $this->attendre($codes, $secret ? '[authentification]' : strtok($ligne, ' :'));
    }

    private function ecrire(string $s): void
    {
        for ($fait = 0, $n = strlen($s); $fait < $n; $fait += $ecrit) {
            $ecrit = fwrite($this->flux, substr($s, $fait));
            if ($ecrit === false || $ecrit === 0) {
                throw new RuntimeException('SMTP : écriture impossible');
            }
        }
    }

    private function attendre(array $codes, string $etape = 'accueil'): string
    {
        $reponse = '';
        while (($ligne = fgets($this->flux, 4096)) !== false) {
            $reponse .= $ligne;
            if (strlen($ligne) < 4 || $ligne[3] !== '-') {
                break;
            }
        }
        if (stream_get_meta_data($this->flux)['timed_out']) {
            throw new RuntimeException("SMTP : délai dépassé ($etape)");
        }
        $code = (int) substr($reponse, 0, 3);
        if (!in_array($code, $codes, true)) {
            throw new RuntimeException("SMTP : réponse $code inattendue ($etape)");
        }
        return $reponse;
    }
}

/* ===================================================================== Copie de secours */

/** Écrit (ou réécrit) la copie de secours d'une demande, sans la photo. Renvoie le chemin du fichier. */
function hf_secours(array $cfg, ?string $fichier, array $d, bool $photo, ?bool $envoye): ?string
{
    if (!$cfg['secours_actif']) {
        return null;
    }
    try {
        $dossier = $cfg['dossier_donnees'] . '/secours';
        hf_dossier($dossier);
        if ($fichier === null) {
            hf_purger_dossier($dossier, $cfg['secours_jours'] * 86400);
            $fichier = $dossier . '/' . date('Ymd-His') . '-' . bin2hex(random_bytes(4)) . '.json';
        }
        $contenu = ['recue' => date(DATE_ATOM), 'nom' => $d['nom'], 'telephone' => $d['tel']['affiche'], 'code_postal' => $d['cp'],
            'type' => $d['type'], 'urgent' => $d['urgent'], 'message' => $d['message'], 'origine' => $d['origine'],
            'photo_jointe' => $photo, 'email_envoye' => $envoye];
        $ancien = umask(0077);
        file_put_contents($fichier, json_encode($contenu, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), LOCK_EX);
        umask($ancien);
        return $fichier;
    } catch (Throwable $e) {
        error_log('[hydroflash] copie de secours impossible : ' . $e->getMessage());
        return $fichier;
    }
}

/* ===================================================================== Purge (ligne de commande) */

if (PHP_SAPI === 'cli') {
    if (($argv[1] ?? '') !== 'purger') {
        fwrite(STDERR, "Usage : php envoi-demande.php purger\n");
        exit(2);
    }
    try {
        $cfg = hf_config();
        hf_purger_dossier($cfg['dossier_donnees'] . '/limites', $cfg['limite_fenetre']);
        hf_purger_dossier($cfg['dossier_donnees'] . '/secours', $cfg['secours_jours'] * 86400);
        echo "Purge effectuée.\n";
        exit(0);
    } catch (Throwable $e) {
        fwrite(STDERR, 'Erreur : ' . $e->getMessage() . "\n");
        exit(1);
    }
}

/* ===================================================================== Traitement */

$cfg = [];
$messageEchec = 'L\'envoi n\'a pas abouti. Appelez-nous directement au <a href="%s">%s</a>.';
$messageRecharger = 'Merci de recharger la page puis de renvoyer votre demande, ou appelez-nous directement au <a href="%s">%s</a>.';
try {
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
        throw new HfErreur(405, 'Ce formulaire s\'envoie depuis le site.');
    }
    $cfg = hf_config();
    $echec = sprintf($messageEchec, htmlspecialchars($cfg['telephone_lien']), htmlspecialchars($cfg['telephone_affiche']));
    $recharger = sprintf($messageRecharger, htmlspecialchars($cfg['telephone_lien']), htmlspecialchars($cfg['telephone_affiche']));

    // Envoi trop volumineux : PHP vide alors $_POST et $_FILES.
    if ($_POST === [] && $_FILES === [] && (int) ($_SERVER['CONTENT_LENGTH'] ?? 0) > 0) {
        throw new HfErreur(413, 'Votre envoi est trop volumineux : la photo ne doit pas dépasser ' . intdiv($cfg['photo_max_octets'], 1048576) . '&nbsp;Mo.');
    }

    // Origine : un navigateur envoie l'en-tête Origin ; il doit désigner ce site.
    $origin = (string) ($_SERVER['HTTP_ORIGIN'] ?? '');
    if ($origin !== '') {
        $hote = strtolower((string) parse_url($origin, PHP_URL_HOST));
        $autorises = array_map('strtolower', $cfg['hotes_autorises'] ?: [preg_replace('/:\d+$/', '', (string) ($_SERVER['HTTP_HOST'] ?? ''))]);
        if ($hote === '' || !in_array($hote, $autorises, true)) {
            throw new HfErreur(403, 'Demande refusée. Appelez-nous directement au <a href="' . htmlspecialchars($cfg['telephone_lien']) . '">' . htmlspecialchars($cfg['telephone_affiche']) . '</a>.');
        }
    }

    // Champ piège rempli : robot. Réponse identique à un succès, rien n'est envoyé.
    if (trim((string) ($_POST['site_web'] ?? '')) !== '') {
        hf_succes($cfg['url_merci']);
    }

    // Horodatage : posé par hf.js. Absent = navigateur sans JavaScript (envoi classique) : toléré, mais compté double.
    $t0 = trim((string) ($_POST['t0'] ?? ''));
    if ($t0 === '' && hf_veut_json()) {
        throw new HfErreur(400, $recharger);
    }
    if (!hf_limiter($cfg, hf_ip($cfg), $t0 === '' ? 2 : 1)) {
        throw new HfErreur(429, 'Plusieurs demandes ont déjà été envoyées en quelques minutes. Pour une urgence, appelez-nous directement au <a href="'
            . htmlspecialchars($cfg['telephone_lien']) . '">' . htmlspecialchars($cfg['telephone_affiche']) . '</a>.');
    }
    if ($t0 !== '') {
        if (!ctype_digit($t0) || strlen($t0) > 15) {
            throw new HfErreur(400, $recharger);
        }
        $ecart = (int) floor(microtime(true) * 1000) - (int) $t0;
        if ($ecart < $cfg['delai_min'] * 1000) {
            throw new HfErreur(422, 'Votre demande a été envoyée trop rapidement. Patientez quelques secondes, puis renvoyez-la.');
        }
        if ($ecart > $cfg['delai_max'] * 1000) {
            throw new HfErreur(422, 'Cette page est ouverte depuis trop longtemps. Rechargez-la avant d\'envoyer votre demande, ou appelez-nous au <a href="'
                . htmlspecialchars($cfg['telephone_lien']) . '">' . htmlspecialchars($cfg['telephone_affiche']) . '</a>.');
        }
    }

    $demande = hf_valider($_POST);
    $photo = hf_photo($cfg);
    [$sujet, $entetes, $corps] = hf_message($cfg, $demande, $photo);

    $copie = hf_secours($cfg, null, $demande, $photo !== null, null);
    try {
        hf_envoyer($cfg, $sujet, $entetes, $corps);
    } catch (Throwable $e) {
        error_log('[hydroflash] envoi de l\'e-mail impossible : ' . $e->getMessage() . ($copie ? ' (copie de secours conservée)' : ''));
        hf_secours($cfg, $copie, $demande, $photo !== null, false);
        throw new HfErreur(502, $echec);
    }
    hf_secours($cfg, $copie, $demande, $photo !== null, true);
    hf_succes($cfg['url_merci']);
} catch (HfErreur $e) {
    $retour = is_string($_POST['origine'] ?? null) && preg_match('#^/[A-Za-z0-9/_-]{0,120}$#', $_POST['origine']) ? $_POST['origine'] : '/contact/';
    hf_echec($e->statut, $e->getMessage(), $cfg, $retour);
} catch (Throwable $e) {
    error_log('[hydroflash] erreur : ' . $e->getMessage());
    hf_echec(503, sprintf($messageEchec, htmlspecialchars($cfg['telephone_lien'] ?? 'tel:+33762882839'), htmlspecialchars($cfg['telephone_affiche'] ?? '07 62 88 28 39')), $cfg);
}
