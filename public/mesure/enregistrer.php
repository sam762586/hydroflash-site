<?php
/**
 * HYDROFLASH — compteur de contacts (clics sur le numéro, demandes envoyées).
 *
 * Pourquoi ce fichier plutôt qu'un outil de mesure du marché :
 * la politique de sécurité du site (Content-Security-Policy) n'autorise que les
 * scripts du site lui-même. Un mouchard extérieur obligerait à l'affaiblir, et
 * imposerait une bannière cookies. Ici : aucun cookie, aucune adresse IP, aucun
 * identifiant de visiteur, aucun tiers. Seulement deux compteurs par page.
 *
 * Reçoit en POST :  e = appel | demande      p = chemin de la page
 * Répond toujours 204 (sans contenu) : le compteur ne doit jamais gêner le visiteur.
 * Les compteurs sont écrits HORS du dossier public (www est entièrement remplacé
 * à chaque mise en ligne : un fichier de données à l'intérieur serait effacé).
 */

declare(strict_types=1);

/* Heure française : les journées doivent se compter sur le fuseau de l'entreprise,
   quel que soit le réglage du serveur. */
date_default_timezone_set('Europe/Paris');

const HF_EVENEMENTS   = ['appel', 'demande'];
const HF_HOTES        = ['hydroflash.fr', 'www.hydroflash.fr'];
const HF_MAX_PAGES    = 400;      // nombre de pages distinctes suivies par mois
const HF_MAX_OCTETS   = 262144;   // garde-fou sur la taille du fichier mensuel
const HF_MAX_PAR_JOUR = 20000;    // garde-fou contre un envoi massif automatisé

/**
 * Termine sans rien dire : le visiteur ne doit jamais voir d'erreur de mesure.
 * $etat n'est renvoye que pour les demandes acceptees, en en-tete : il sert a
 * verifier de l'exterieur que l'ecriture fonctionne, sans divulguer un chiffre.
 */
function hf_fin(string $etat = ''): void
{
    http_response_code(204);
    header_remove('Content-Type');
    if ($etat !== '') {
        header('X-Mesure: ' . $etat);
    }
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    hf_fin();
}

/* Même origine exigée : le compteur n'accepte que les pages du site. */
$origine = (string) ($_SERVER['HTTP_ORIGIN'] ?? '');
if ($origine === '') {
    hf_fin();
}
$hote = parse_url($origine, PHP_URL_HOST);
if (!is_string($hote) || !in_array(strtolower($hote), HF_HOTES, true)) {
    hf_fin();
}

$evenement = (string) ($_POST['e'] ?? '');
if (!in_array($evenement, HF_EVENEMENTS, true)) {
    hf_fin();
}

/* Chemin de page : jeu de caractères restreint, longueur bornée, sinon regroupé. */
$page = (string) ($_POST['p'] ?? '');
if ($page === '' || strlen($page) > 80 || !preg_match('#^/[A-Za-z0-9/_.-]*$#', $page)) {
    $page = '/(autre)';
}

$dossier = dirname(__DIR__, 2) . '/mesures-hydroflash';
if (!is_dir($dossier) && !@mkdir($dossier, 0700, true) && !is_dir($dossier)) {
    hf_fin('dossier-impossible');
}

$fichier = $dossier . '/' . date('Y-m') . '.json';
$f = @fopen($fichier, 'c+');
if ($f === false) {
    hf_fin('fichier-impossible');
}

if (!flock($f, LOCK_EX)) {
    fclose($f);
    hf_fin('verrou-impossible');
}

$taille  = (int) (fstat($f)['size'] ?? 0);
$contenu = $taille > 0 ? (string) fread($f, $taille) : '';
$donnees = $contenu !== '' ? json_decode($contenu, true) : [];
if (!is_array($donnees)) {
    $donnees = [];
}

$jour = date('Y-m-d');
if (!isset($donnees[$jour]) || !is_array($donnees[$jour])) {
    $donnees[$jour] = [];
}
if (!isset($donnees[$jour][$evenement]) || !is_array($donnees[$jour][$evenement])) {
    $donnees[$jour][$evenement] = [];
}

$total = 0;
foreach ($donnees[$jour] as $parEvenement) {
    if (is_array($parEvenement)) {
        $total += array_sum(array_map('intval', $parEvenement));
    }
}

$connue  = isset($donnees[$jour][$evenement][$page]);
$place   = $connue || (count($donnees[$jour][$evenement]) < HF_MAX_PAGES && $taille < HF_MAX_OCTETS);
$etat    = 'plein';
if ($place && $total < HF_MAX_PAR_JOUR) {
    $donnees[$jour][$evenement][$page] = (int) ($donnees[$jour][$evenement][$page] ?? 0) + 1;

    $json = json_encode($donnees, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    if (is_string($json)) {
        ftruncate($f, 0);
        rewind($f);
        $etat = fwrite($f, $json) !== false ? 'ok' : 'ecriture-impossible';
        fflush($f);
    }
}

flock($f, LOCK_UN);
fclose($f);
@chmod($fichier, 0600);
hf_fin($etat);
