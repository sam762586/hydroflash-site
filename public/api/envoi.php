<?php
/**
 * HYDROFLASH — envoi d'e-mails depuis le logiciel.
 * Reçoit un message (et éventuellement un PDF) et l'envoie par le SMTP OVH.
 * La configuration et le mot de passe sont hors du site : ../../config-mail.php
 */
declare(strict_types=1);

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\SMTP;
use PHPMailer\PHPMailer\Exception as MailException;

require __DIR__ . '/lib/Exception.php';
require __DIR__ . '/lib/PHPMailer.php';
require __DIR__ . '/lib/SMTP.php';

const MAX_PJ    = 8388608;   // 8 Mo de pièce jointe
const MAX_CORPS = 20000;     // 20 000 caractères de message

function repond(int $code, array $data): never {
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

/** Cherche config-mail.php en remontant depuis le site, puis à côté. */
function config(): array {
    foreach ([__DIR__ . '/../../config-mail.php', __DIR__ . '/../config-mail.php', __DIR__ . '/config-mail.php'] as $p) {
        if (is_file($p)) {
            $c = require $p;
            if (is_array($c)) return $c;
        }
    }
    repond(500, ['ok' => false, 'erreur' => 'Configuration absente : dépose config-mail.php hors du site.']);
}

$cfg = config();

/* ---- CORS : seules les origines déclarées peuvent appeler ce script ---- */
$origine = $_SERVER['HTTP_ORIGIN'] ?? '';
$permises = $cfg['origines'] ?? [];
if ($origine !== '' && in_array($origine, $permises, true)) {
    header('Access-Control-Allow-Origin: ' . $origine);
    header('Vary: Origin');
    header('Access-Control-Allow-Headers: Content-Type, X-HF-Cle');
    header('Access-Control-Allow-Methods: POST, OPTIONS');
    header('Access-Control-Max-Age: 86400');
}
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') { http_response_code(204); exit; }
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') repond(405, ['ok' => false, 'erreur' => 'Méthode non autorisée.']);
if ($origine !== '' && !in_array($origine, $permises, true)) repond(403, ['ok' => false, 'erreur' => 'Origine non autorisée.']);

/* ---- Clé partagée ---- */
$cle = $_SERVER['HTTP_X_HF_CLE'] ?? '';
$attendue = (string)($cfg['cle'] ?? '');
if ($attendue === '' || strlen($attendue) < 20 || str_contains($attendue, 'REMPLACE-MOI')) {
    repond(500, ['ok' => false, 'erreur' => 'Clé non configurée sur le serveur.']);
}
if (!is_string($cle) || !hash_equals($attendue, $cle)) {
    usleep(300000);
    repond(401, ['ok' => false, 'erreur' => 'Clé invalide.']);
}

/* ---- Garde-fou : nombre d'envois par heure ---- */
$max = (int)($cfg['max_heure'] ?? 60);
$compteur = sys_get_temp_dir() . '/hf-envois-' . date('YmdH') . '.txt';
$n = is_file($compteur) ? (int)file_get_contents($compteur) : 0;
if ($n >= $max) repond(429, ['ok' => false, 'erreur' => 'Trop d’envois cette heure-ci. Réessaie plus tard.']);

/* ---- Lecture de la demande ---- */
$brut = file_get_contents('php://input') ?: '';
$d = json_decode($brut, true);
if (!is_array($d)) repond(400, ['ok' => false, 'erreur' => 'Demande illisible.']);

$dest   = trim((string)($d['dest'] ?? ''));
$sujet  = trim((string)($d['sujet'] ?? ''));
$corps  = (string)($d['corps'] ?? '');
$copie  = trim((string)($d['copie'] ?? ''));

if (!filter_var($dest, FILTER_VALIDATE_EMAIL)) repond(400, ['ok' => false, 'erreur' => 'Adresse du destinataire invalide.']);
if ($copie !== '' && !filter_var($copie, FILTER_VALIDATE_EMAIL)) repond(400, ['ok' => false, 'erreur' => 'Adresse en copie invalide.']);
if ($sujet === '' || mb_strlen($sujet) > 300) repond(400, ['ok' => false, 'erreur' => 'Objet manquant ou trop long.']);
if ($corps === '' || mb_strlen($corps) > MAX_CORPS) repond(400, ['ok' => false, 'erreur' => 'Message manquant ou trop long.']);
// pas d'injection d'en-têtes
if (preg_match('/[\r\n]/', $sujet . $dest . $copie)) repond(400, ['ok' => false, 'erreur' => 'Caractères interdits.']);

/* ---- Pièce jointe : un PDF, et rien d'autre ---- */
$pj = null;
if (!empty($d['piece']) && is_array($d['piece'])) {
    $nom = (string)($d['piece']['nom'] ?? 'document.pdf');
    $nom = preg_replace('/[^A-Za-z0-9._ -]/', '_', $nom) ?: 'document.pdf';
    if (!preg_match('/\.pdf$/i', $nom)) $nom .= '.pdf';
    $b64 = (string)($d['piece']['contenu'] ?? '');
    $bin = base64_decode($b64, true);
    if ($bin === false) repond(400, ['ok' => false, 'erreur' => 'Pièce jointe illisible.']);
    if (strlen($bin) > MAX_PJ) repond(413, ['ok' => false, 'erreur' => 'Pièce jointe trop lourde (8 Mo maximum).']);
    if (substr($bin, 0, 4) !== '%PDF') repond(400, ['ok' => false, 'erreur' => 'Seuls les PDF sont acceptés.']);
    $pj = ['nom' => $nom, 'bin' => $bin];
}

/* ---- Envoi ---- */
$m = new PHPMailer(true);
try {
    $m->isSMTP();
    $m->Host       = (string)($cfg['smtp_host'] ?? 'smtp.mail.ovh.net');
    $m->Port       = (int)($cfg['smtp_port'] ?? 465);
    $m->SMTPAuth   = true;
    $m->Username   = (string)$cfg['smtp_user'];
    $m->Password   = (string)$cfg['smtp_pass'];
    $m->SMTPSecure = $m->Port === 587 ? PHPMailer::ENCRYPTION_STARTTLS : PHPMailer::ENCRYPTION_SMTPS;
    $m->CharSet    = 'UTF-8';
    $m->Timeout    = 20;

    // L'expéditeur vient TOUJOURS de la configuration, jamais de la demande.
    $m->setFrom((string)$cfg['smtp_user'], (string)($cfg['from_nom'] ?? 'HYDROFLASH'));
    $m->addReplyTo((string)$cfg['smtp_user'], (string)($cfg['from_nom'] ?? 'HYDROFLASH'));
    $m->addAddress($dest);
    if ($copie !== '') $m->addCC($copie);

    $m->Subject = $sujet;
    $m->isHTML(false);
    $m->Body = $corps;
    if ($pj) $m->addStringAttachment($pj['bin'], $pj['nom'], PHPMailer::ENCODING_BASE64, 'application/pdf');

    $m->send();
} catch (MailException|Throwable $e) {
    @file_put_contents(sys_get_temp_dir() . '/hf-envois.log',
        date('c') . "\tECHEC\t" . $dest . "\t" . $m->ErrorInfo . "\n", FILE_APPEND);
    repond(502, ['ok' => false, 'erreur' => 'L’envoi a échoué côté serveur de messagerie.']);
}

@file_put_contents($compteur, (string)($n + 1));
@file_put_contents(sys_get_temp_dir() . '/hf-envois.log',
    date('c') . "\tOK\t" . $dest . "\t" . $sujet . ($pj ? "\t" . $pj['nom'] : '') . "\n", FILE_APPEND);

repond(200, ['ok' => true, 'dest' => $dest, 'piece' => $pj ? $pj['nom'] : null]);
