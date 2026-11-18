<?php
/**
 * HYDROFLASH — configuration du traitement du formulaire (public/envoi-demande.php → racine web/envoi-demande.php).
 *
 * MISE EN PLACE
 * 1. Copiez ce fichier HORS de la racine web, sous le nom « config-hydroflash.php », dans le dossier PARENT
 *    de la racine web (emplacement cherché par défaut) :
 *      - o2switch (cPanel) : /home/<compte>/config-hydroflash.php   (racine web : /home/<compte>/public_html)
 *      - OVHcloud          : /home/<identifiant>/config-hydroflash.php (racine web : /home/<identifiant>/www)
 *    Autre emplacement : variable d'environnement HF_CONFIG, par exemple dans le .htaccess de la racine web :
 *      SetEnv HF_CONFIG /home/<compte>/prive/config-hydroflash.php
 * 2. Renseignez les valeurs marquées « À RENSEIGNER ». Droits conseillés : 600 (chmod 600 config-hydroflash.php).
 * 3. Ne versionnez JAMAIS la copie renseignée (« config-hydroflash.php » est ignoré par .gitignore).
 * 4. Testez un envoi réel après la mise en ligne (avec et sans photo), puis vérifiez la réception dans Gmail
 *    (dossier « Spam » compris). En cas d'échec, consultez le journal d'erreurs PHP de l'hébergeur
 *    (messages préfixés « [hydroflash] »).
 *
 * ENVOI : mail() OU SMTP
 * - « mail » : fonction mail() de PHP, via le serveur de messagerie de l'hébergeur. Simple, sans mot de passe.
 *   L'expéditeur doit être une adresse du domaine hydroflash.fr, et le domaine doit publier SPF, DKIM et DMARC
 *   (zone DNS), sinon Gmail risque de classer les demandes en spam.
 * - « smtp » : envoi authentifié via une boîte e-mail du domaine (recommandé pour la délivrabilité) :
 *   STARTTLS sur le port 587 ou TLS sur le port 465, certificat vérifié. Paramètres fournis par l'hébergeur.
 *
 * PHP : version 8.1 ou plus ; extensions mbstring, fileinfo, gd (photos). upload_max_filesize ≥ 9M et
 * post_max_size ≥ 10M (voir public/.user.ini ; sinon, panneau de l'hébergeur).
 *
 * PURGE PLANIFIÉE (facultative, recommandée si la copie de secours est activée) — tâche cron quotidienne :
 *   php /home/<compte>/public_html/envoi-demande.php purger
 */
return [
    // Adresse qui reçoit les demandes (confirmée le 18/11/2026).
    'destinataire' => 'hydroflash@gmail.com',

    // Adresse d'expédition : une adresse du domaine, existante chez l'hébergeur (ex. formulaire@hydroflash.fr).
    'expediteur' => 'À RENSEIGNER',
    'expediteur_nom' => 'Site HYDROFLASH',

    // Secret aléatoire (64 caractères hexadécimaux) servant à rendre les adresses IP non lisibles.
    // Générer : php -r "echo bin2hex(random_bytes(32)), PHP_EOL;"
    'secret' => '',

    // Dossier PRIVÉ, hors racine web (limitation des envois, copies de secours). Créé automatiquement (droits 700).
    // Ex. o2switch : '/home/<compte>/hydroflash-donnees' ; OVHcloud : '/home/<identifiant>/hydroflash-donnees'
    'dossier_donnees' => '',

    // Numéro affiché dans les messages d'erreur (source : src/data/entreprise.ts).
    'telephone_affiche' => '07 62 88 28 39',
    'telephone_lien' => 'tel:+33762882839',

    // Page affichée après un envoi réussi.
    'url_merci' => '/contact/merci/',

    // Hôtes autorisés dans l'en-tête Origin (vide = hôte de la requête). Ex. ['hydroflash.fr'].
    'hotes_autorises' => ['hydroflash.fr'],

    // En-tête contenant l'IP réelle si l'hébergeur place un proxy devant le site (sinon laisser vide).
    // Ex. 'HTTP_X_FORWARDED_FOR' — à vérifier auprès de l'hébergeur avant de l'activer.
    'entete_ip' => '',

    // Limitation de débit : au plus 5 envois par adresse IP sur 10 minutes (600 s).
    'limite_envois' => 5,
    'limite_fenetre' => 600,

    // Délai entre l'affichage de la page et l'envoi : entre 3 s (robots) et 2 h (page trop ancienne).
    'delai_min' => 3,
    'delai_max' => 7200,

    // Photo : 8 Mo maximum, 40 mégapixels maximum, réduite à 2000 px de côté, JPEG qualité 82.
    'photo_max_octets' => 8 * 1024 * 1024,
    'photo_max_pixels' => 40_000_000,
    'photo_cote_max' => 2000,
    'photo_qualite' => 82,

    // Copie de secours (sans la photo) dans dossier_donnees/secours, supprimée après N jours.
    // N doit correspondre à la durée annoncée dans la politique de confidentialité.
    'secours_actif' => false,
    'secours_jours' => 30,

    // Mode d'envoi : 'mail' ou 'smtp'.
    'envoi' => 'mail',
    // mail() : ajoute « -f expediteur » (adresse de retour alignée sur l'expéditeur, utile pour SPF).
    'mail_option_f' => true,

    // SMTP (utilisé seulement si 'envoi' => 'smtp').
    'smtp' => [
        'hote' => 'À RENSEIGNER',         // ex. serveur SMTP indiqué par l'hébergeur
        'port' => 587,                   // 587 (STARTTLS) ou 465 (TLS)
        'securite' => 'starttls',        // 'starttls' ou 'ssl' (TLS dès la connexion, port 465)
        'utilisateur' => 'À RENSEIGNER', // adresse complète de la boîte d'envoi
        'mot_de_passe' => '',            // mot de passe de la boîte : uniquement dans la copie hors dépôt
        'delai' => 15,                   // secondes
        'cafile' => null,                // autorités de certification spécifiques (laisser null en général)
    ],
];
