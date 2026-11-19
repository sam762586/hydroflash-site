<?php
/**
 * HYDROFLASH — installation de l'envoi d'e-mails, une seule fois.
 * Écrit config-mail.php hors du site, avec le mot de passe saisi ici
 * et une clé tirée au hasard par le serveur.
 * Dès que la configuration existe, cette page refuse de fonctionner.
 */
declare(strict_types=1);
header('Content-Type: text/html; charset=utf-8');
header('X-Robots-Tag: noindex, nofollow');

$cible   = __DIR__ . '/../../config-mail.php';   // hors de www/
$secours = __DIR__ . '/../config-mail.php';
$dejaFait = is_file($cible) || is_file($secours);

$err = null; $cle = null; $ok = false; $chemin = null; $horsSite = true;

if (!$dejaFait && ($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
    $user = trim((string)($_POST['user'] ?? ''));
    $pass = (string)($_POST['pass'] ?? '');
    $nom  = trim((string)($_POST['nom'] ?? 'HYDROFLASH'));
    $host = trim((string)($_POST['host'] ?? 'smtp.mail.ovh.net'));
    $port = (int)($_POST['port'] ?? 465);

    if (!filter_var($user, FILTER_VALIDATE_EMAIL)) $err = 'Adresse d’envoi invalide.';
    elseif (strlen($pass) < 4)                      $err = 'Mot de passe manquant.';
    elseif (!preg_match('/^[a-z0-9.\-]+$/i', $host)) $err = 'Serveur SMTP invalide.';
    elseif (!in_array($port, [465, 587], true))      $err = 'Port invalide (465 ou 587).';
    else {
        $cle = rtrim(strtr(base64_encode(random_bytes(33)), '+/', '-_'), '=');
        $conf = "<?php\n"
            . "// Écrit par installer.php le " . date('d/m/Y à H:i') . ". Ne pas versionner.\n"
            . "return [\n"
            . "  'smtp_user' => " . var_export($user, true) . ",\n"
            . "  'smtp_pass' => " . var_export($pass, true) . ",\n"
            . "  'from_nom'  => " . var_export($nom ?: 'HYDROFLASH', true) . ",\n"
            . "  'cle'       => " . var_export($cle, true) . ",\n"
            . "  'smtp_host' => " . var_export($host, true) . ",\n"
            . "  'smtp_port' => " . var_export($port, true) . ",\n"
            . "  'origines'  => ['https://hydroflash-devis.web.app', 'https://hydroflash-devis.firebaseapp.com'],\n"
            . "  'max_heure' => 60,\n"
            . "];\n";
        $dest = @is_writable(dirname($cible)) ? $cible : $secours;
        if (@file_put_contents($dest, $conf) === false) {
            $err = 'Impossible d’écrire ' . htmlspecialchars($dest) . ' — vérifie les droits.';
            $cle = null;
        } else {
            @chmod($dest, 0600);
            $ok = true; $chemin = $dest; $horsSite = ($dest === $cible);
        }
    }
}
?>
<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex">
<title>HYDROFLASH — installation de l'envoi d'e-mails</title>
<style>
body{margin:0;background:#F2F3F5;color:#14161A;font:16px/1.55 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
.w{max-width:620px;margin:0 auto;padding:28px 18px 60px}
.c{background:#fff;border:1px solid #DADDE2;border-radius:12px;padding:20px;margin-bottom:16px}
h1{font-size:22px;margin:0 0 6px}h2{font-size:13px;letter-spacing:.6px;text-transform:uppercase;color:#5C6169;margin:0 0 10px}
label{display:block;font-size:13.5px;font-weight:600;color:#5C6169;margin:14px 0 6px}
input{width:100%;box-sizing:border-box;font:inherit;font-size:16px;padding:11px 12px;border:1px solid #DADDE2;border-radius:9px}
input:focus{outline:2px solid #F26A1B;outline-offset:1px}
button{font:inherit;font-weight:700;padding:13px 18px;border-radius:10px;border:0;background:#F26A1B;color:#fff;cursor:pointer;min-height:48px;margin-top:18px}
.ok{background:#E6F4EC;border:1px solid #BFE3CE;color:#14532D;border-radius:10px;padding:14px 16px}
.err{background:#FDECEA;border:1px solid #F3C1BC;color:#8A1C14;border-radius:10px;padding:14px 16px}
.cle{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:15px;word-break:break-all;background:#F2F3F5;border:1px solid #DADDE2;border-radius:9px;padding:12px;margin:10px 0}
.m{color:#5C6169;font-size:13.5px}.bar{height:4px;background:#F26A1B}
</style></head><body><div class="bar"></div><div class="w">
<?php if ($dejaFait): ?>
  <div class="c"><h1>Déjà configuré</h1>
  <div class="ok"><b>L’envoi d’e-mails est déjà en place.</b><div class="m" style="margin-top:4px">Cette page ne sert qu’une fois. Pour repartir de zéro, supprime <code>config-mail.php</code> sur l’hébergement, puis recharge.</div></div></div>
<?php elseif ($ok): ?>
  <div class="c"><h1>C’est installé</h1>
  <div class="<?= $horsSite ? 'ok' : 'err' ?>"><b><?= $horsSite ? 'La configuration est écrite hors du site' : 'Attention : écrite À L’INTÉRIEUR du site' ?></b>
    <div class="m" style="margin-top:4px"><?= htmlspecialchars((string)$chemin) ?></div>
    <div class="m" style="margin-top:4px"><?= $horsSite
      ? 'Ton mot de passe n’apparaît nulle part ailleurs.'
      : 'Le dossier au-dessus n’était pas accessible en écriture. Le fichier n’est pas servi aux visiteurs, mais il sera effacé à la prochaine mise en ligne du site : déplace-le d’un niveau au-dessus dès que possible.' ?></div></div>
  <h2 style="margin-top:22px">Dernière étape</h2>
  <p class="m" style="margin:0">Copie cette clé et colle-la dans le logiciel, onglet <b>Société</b>, champ <b>Clé partagée</b>. Elle ne sera plus affichée.</p>
  <div class="cle" id="k"><?= htmlspecialchars($cle) ?></div>
  <button type="button" onclick="navigator.clipboard&&navigator.clipboard.writeText(document.getElementById('k').textContent.trim()).then(function(){this.textContent='Clé copiée';}.bind(this))">Copier la clé</button>
  <p class="m">Tu peux ensuite supprimer <code>installer.php</code> : il refusera de toute façon de se relancer.</p></div>
<?php else: ?>
  <div class="c"><h1>Envoi d’e-mails — installation</h1>
  <p class="m" style="margin:0 0 4px">Ton mot de passe est écrit directement dans un fichier de ton hébergement, hors du site. Il ne transite par personne d’autre.</p>
  <?php if ($err): ?><div class="err" style="margin-top:14px"><?= htmlspecialchars($err) ?></div><?php endif; ?>
  <form method="post" autocomplete="off">
    <label for="user">Adresse d’envoi</label>
    <input id="user" name="user" type="email" required value="<?= htmlspecialchars((string)($_POST['user'] ?? 'contact@hydroflash.fr')) ?>">
    <label for="pass">Mot de passe de cette boîte</label>
    <input id="pass" name="pass" type="password" required autocomplete="new-password">
    <label for="nom">Nom affiché chez le destinataire</label>
    <input id="nom" name="nom" type="text" value="<?= htmlspecialchars((string)($_POST['nom'] ?? 'HYDROFLASH')) ?>">
    <label for="host">Serveur SMTP</label>
    <input id="host" name="host" type="text" value="<?= htmlspecialchars((string)($_POST['host'] ?? 'smtp.mail.ovh.net')) ?>">
    <label for="port">Port (465 ou 587)</label>
    <input id="port" name="port" type="number" value="<?= htmlspecialchars((string)($_POST['port'] ?? '465')) ?>">
    <button type="submit">Installer</button>
  </form></div>
<?php endif; ?>
</div></body></html>
