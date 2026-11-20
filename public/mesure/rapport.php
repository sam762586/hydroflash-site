<?php
/**
 * HYDROFLASH — relevé des contacts venus du site.
 *
 * Page protégée par mot de passe (voir le .htaccess du dossier) : les chiffres
 * de l'entreprise n'ont pas à être publics.
 *
 * Sortie en texte brut : la politique de sécurité du site interdit les styles
 * en ligne, et un tableau de texte reste lisible sur téléphone.
 *
 * Paramètre facultatif : ?mois=AAAA-MM   (par défaut, les trois derniers mois)
 */

declare(strict_types=1);

/* Heure française : les journées doivent se compter sur le fuseau de l'entreprise,
   quel que soit le réglage du serveur. */
date_default_timezone_set('Europe/Paris');

header('Content-Type: text/plain; charset=utf-8');
header('Cache-Control: no-store');
header('X-Robots-Tag: noindex, nofollow');

const HF_MOIS_PAR_DEFAUT = 3;
const HF_PAGES_AFFICHEES = 12;

$mois_fr = [
    1 => 'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
    'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];

/** Intitulé « novembre 2026 » à partir de « 2026-11 ». */
function hf_titre_mois(string $cle, array $noms): string
{
    [$a, $m] = array_pad(explode('-', $cle, 2), 2, '');
    $n = (int) $m;
    return ($noms[$n] ?? $cle) . ' ' . $a;
}

$dossier = dirname(__DIR__, 2) . '/mesures-hydroflash';
$fichiers = is_dir($dossier) ? glob($dossier . '/*.json') : [];
if (!is_array($fichiers)) {
    $fichiers = [];
}
rsort($fichiers);

echo "HYDROFLASH — contacts venus du site\n";
echo 'Relevé du ' . date('d/m/Y à H\hi') . "\n";
echo str_repeat('=', 46) . "\n\n";

if ($fichiers === []) {
    echo "Aucune mesure enregistrée pour l'instant.\n\n";
    echo "C'est normal tant que personne n'a visité le site depuis la mise\n";
    echo "en place du compteur. Les clics sur le numéro et les demandes\n";
    echo "envoyées apparaîtront ici, par jour et par page.\n";
    exit;
}

$demande = (string) ($_GET['mois'] ?? '');
if ($demande !== '' && preg_match('/^\d{4}-\d{2}$/', $demande)) {
    $fichiers = array_values(array_filter(
        $fichiers,
        static fn (string $f): bool => basename($f, '.json') === $demande
    ));
} else {
    $fichiers = array_slice($fichiers, 0, HF_MOIS_PAR_DEFAUT);
}

foreach ($fichiers as $fichier) {
    $donnees = json_decode((string) @file_get_contents($fichier), true);
    if (!is_array($donnees)) {
        continue;
    }
    krsort($donnees);

    $appels = 0;
    $demandes = 0;
    $pages_appel = [];
    $pages_demande = [];
    $lignes_jour = [];

    foreach ($donnees as $jour => $parEvenement) {
        if (!is_array($parEvenement)) {
            continue;
        }
        $a = array_sum(array_map('intval', (array) ($parEvenement['appel'] ?? [])));
        $d = array_sum(array_map('intval', (array) ($parEvenement['demande'] ?? [])));
        $appels += $a;
        $demandes += $d;

        foreach ((array) ($parEvenement['appel'] ?? []) as $page => $n) {
            $pages_appel[$page] = ($pages_appel[$page] ?? 0) + (int) $n;
        }
        foreach ((array) ($parEvenement['demande'] ?? []) as $page => $n) {
            $pages_demande[$page] = ($pages_demande[$page] ?? 0) + (int) $n;
        }

        $jj = is_string($jour) ? substr($jour, 8, 2) . '/' . substr($jour, 5, 2) : '??';
        $lignes_jour[] = sprintf('  %s   %3d appel%s   %3d demande%s', $jj, $a, $a > 1 ? 's' : ' ', $d, $d > 1 ? 's' : ' ');
    }

    arsort($pages_appel);
    arsort($pages_demande);

    echo strtoupper(hf_titre_mois(basename($fichier, '.json'), $mois_fr)) . "\n";
    echo str_repeat('-', 46) . "\n";
    echo sprintf("  Clics sur le numéro  : %d\n", $appels);
    echo sprintf("  Demandes envoyées    : %d\n", $demandes);
    echo "\n  Par jour\n";
    echo implode("\n", $lignes_jour) . "\n";

    if ($pages_appel !== []) {
        echo "\n  Pages d'où l'on appelle\n";
        foreach (array_slice($pages_appel, 0, HF_PAGES_AFFICHEES, true) as $page => $n) {
            echo sprintf("  %4d  %s\n", $n, $page);
        }
    }
    if ($pages_demande !== []) {
        echo "\n  Pages d'où part une demande\n";
        foreach (array_slice($pages_demande, 0, HF_PAGES_AFFICHEES, true) as $page => $n) {
            echo sprintf("  %4d  %s\n", $n, $page);
        }
    }
    echo "\n\n";
}

echo str_repeat('=', 46) . "\n";
echo "Mois disponibles : ";
$tous = is_dir($dossier) ? glob($dossier . '/*.json') : [];
echo implode(', ', array_map(static fn (string $f): string => basename($f, '.json'), is_array($tous) ? $tous : []));
echo "\nPour en voir un en particulier : ajouter ?mois=AAAA-MM à l'adresse.\n";
echo "\nNe sont comptés ni cookie, ni adresse IP, ni visiteur : seulement\n";
echo "le nombre de clics sur le numéro et de demandes envoyées, par page.\n";
echo "Le nombre de visites, lui, est dans l'espace client OVH :\n";
echo "Hébergements > votre hébergement > Statistiques et logs.\n";
