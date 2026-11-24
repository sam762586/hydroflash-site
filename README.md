# Site HYDROFLASH

Site vitrine statique (Astro 7, sortie statique) — design validé le 18/11/2026 :
**style C « Next » ≥ 701 px (ordinateur/tablette)**, **style A « Impact » ≤ 700 px (smartphone)**.
Références de design : `../03_CONCEPTS/concept-final/` (prototype) et `../04_MAQUETTES/concept-final/` (captures).

## Commandes

```bash
npm install          # dépendances (versions figées)
npm run dev          # développement (http://localhost:4321)
npm run build        # PRÉPRODUCTION : étiquettes « à confirmer » visibles, noindex, robots.txt bloquant
npm run build:prod   # PRODUCTION : HF_ENV=production SITE_URL=https://… ; échoue s'il manque une information obligatoire
```

## Règles du projet (rappel de `../CLAUDE.md`)

- **Aucune information inventée.** Toute donnée d'entreprise vient de `src/data/entreprise.ts` (source unique).
  `null` = non confirmé → `<Tbc />` (visible en préproduction, rien en production) et bloc masqué en production.
- Logo : fichiers officiels de `public/img/logo/` uniquement, jamais modifiés.
- Téléphone toujours en texte cliquable (`entreprise.telephone.lien`), jamais en image.
- Statut des images affiché (photo réelle / photo libre / illustration). Aucune image présentée comme une intervention réelle.

## Architecture

| Élément | Rôle |
|---|---|
| `src/layouts/Base.astro` | `<head>` SEO, robots selon l'environnement, en-tête, menu, pied de page, barre d'appel mobile |
| `src/styles/socle.css` | jetons communs (couleurs, `--orange` unique, axes typographiques), global |
| `src/styles/ordinateur.css` / `mobile.css` | rendu C (≥ 701 px) / rendu A (≤ 700 px) : en-tête, pied, accueil, FAQ, contact… |
| `src/styles/contenu-*.css` | pages intérieures (`FEUILLE_CONTENU`) : `.shero`, `.prose`, `.cards`, `.callout`, `.steps-c`, `.kv`, `.chips`… |
| `src/styles/urgence-*.css` | page urgence (`FEUILLE_URGENCE`) |
| `src/styles/blocs-*.css` | blocs partagés (`FEUILLE_BLOCS`) : calculateur de prix, « Vérifiez-nous », « Ce qu'on a trouvé », bascule Particulier/Pro |
| `src/components/` | `SousHero`, `Breadcrumb` (+ JSON-LD), `Faq`, `ContactCta`, `FormulaireDemande`, `Tbc`, `JsonLd`, `CalculateurPrix`, `Preuves`, `Trouvailles`… |
| `src/data/` | `entreprise.ts` (source unique), `services.ts`, `navigation.ts`, `trouvailles.ts` (photos réelles d'interventions, 3 minimum pour publier) |
| `src/lib/prix.ts` | TTC, taux de TVA par prestation (10 % seulement si `tarifs.tvaReduiteConfirmee === true`, validée le 24/11/2026), format des prix, texte de la règle TVA affiché sur le site (`regleTva`) |
| `src/content/` | Markdown éditable : `prestations/`, `conseils/` (schémas : `src/content.config.ts`) |
| `public/js/hf.js` | menu, barre d'appel, « Être rappelé », vérificateur de code postal, envoi des formulaires, présélection `?prestation=` |
| `public/js/calculateur.js` | calculateur de prix (zone depuis le code postal, TVA ; particuliers : même prix à toute heure ; professionnels : prix en semaine 8 h–18 h, sinon sur devis) ; données passées par `data-calc` |
| `public/data/communes-76-27.json` | codes postaux → communes (INSEE / La Poste via @etalab/decoupage-administratif 6.0.0, Licence Ouverte) |
| `public/envoi-demande.php` | traitement du formulaire (hébergement PHP) |

### Conventions de page
- Une page = `Base` + (`SousHero` pour les pages intérieures) + sections `<section class="sec sec-sm">` + `ContactCta`.
- Une seule source HTML par page ; éléments propres à un rendu : `.d-only` (ordinateur) / `.m-only` (smartphone).
- Feuilles propres à une page : `src/styles/pages/<page>-ordinateur.css` et `-mobile.css`, importées avec `?url`
  et passées à `Base` via `feuilles={[FEUILLE_CONTENU, { ordi, mobile }]}`.
- Titres : un seul `h1` par page, puis `h2` / `h3` sans saut de niveau.
- Liens internes avec barre oblique finale (`/contact/`).

## URL (décision D1 : prestations à la racine)

`/` · `/urgence-debouchage-24h/` · `/services/` · `/debouchage-canalisation/` · `/curage-canalisation/` ·
`/detartrage-canalisation/` · `/inspection-camera-canalisation/` (« Passage caméra ») · `/pompage-vidange/` ·
`/entretien-reseaux-assainissement/` · `/professionnels/` · `/zones-intervention/` (+ `/seine-maritime-76/`, `/eure-27/`) ·
`/a-propos/` · `/conseils/` · `/contact/` (+ `/contact/merci/`, noindex) · pages légales · `/plan-du-site/` · 404.

## Mise en ligne (hébergement mutualisé PHP : o2switch ou OVHcloud, choix en cours)

Prérequis : informations obligatoires renseignées dans `src/data/entreprise.ts` (raison sociale, forme juridique,
SIRET, RCS/RM, adresse, directeur de publication, hébergeur, médiateur, durée de conservation des demandes),
accord du client pour l'hébergement (service payant), accès au domaine `hydroflash.fr`.

1. `npm run build:prod` — construit en production **et** lance `scripts/verifier-production.mjs` :
   la commande échoue s'il manque une information obligatoire, s'il reste une valeur provisoire
   (« à confirmer », `data-tbc`…), un lien interne cassé, un robots.txt bloquant ou le bandeau de préproduction.
   Vérifier un autre dossier : `node scripts/verifier-production.mjs <dossier>`.
2. Envoyer **tout** le contenu de `dist/` (fichiers cachés compris : `.htaccess`, `.user.ini`, `.well-known/`)
   dans la racine web (`public_html/` chez o2switch, `www/` chez OVHcloud).
3. Copier `server/config.exemple.php` **hors de la racine web** sous le nom `config-hydroflash.php`
   (ou chemin indiqué par `SetEnv HF_CONFIG …`), `chmod 600`, puis renseigner `expediteur`, `secret`,
   `dossier_donnees` (et le bloc SMTP si une boîte au nom du domaine est créée). PHP 8.1+ avec GD.
4. HTTPS : certificat Let's Encrypt du panneau d'hébergement, puis contrôler les en-têtes et redirections
   (le `.htaccess` n'a pas encore été testé sur l'Apache de l'hébergeur) :
   ```bash
   curl -sI http://hydroflash.fr/ | head -5        # 301 vers https://hydroflash.fr/
   curl -sI https://www.hydroflash.fr/ | head -5   # 301 vers https://hydroflash.fr/
   curl -sI https://hydroflash.fr/ | grep -i "content-security\|strict-transport\|x-content-type"
   curl -s -o /dev/null -w "%{http_code}\n" https://hydroflash.fr/.user.ini   # 404 attendu
   ```
5. Envoyer une vraie demande depuis `/contact/` et depuis « Être rappelé » : réception sur contact@hydroflash.fr,
   pièce jointe photo, page `/contact/merci/`.
6. Déclarer `https://hydroflash.fr/sitemap-index.xml` dans Google Search Console ; relier la fiche Google
   (même nom, même numéro 07 62 88 28 39) dès qu'elle existe.
7. Délivrabilité conseillée : boîte e-mail au nom du domaine + enregistrements SPF, DKIM et DMARC, envoi en SMTP.

## Contrôles qualité (18/11/2026, préproduction)

| Contrôle | Outil | Résultat |
|---|---|---|
| Accessibilité automatique WCAG 2.2 A/AA | axe-core, 26 pages × 1440 / 390 px (`../_outils/site_a11y.cjs`) | 0 défaut |
| Liens, images, polices, scripts | parcours Playwright de toutes les pages | 0 erreur |
| Performance mobile (médiane de 3, gzip comme le `.htaccess`) | Lighthouse 13.6 | accueil 98, urgence 96, débouchage 100, contact 100 |
| Performance ordinateur | Lighthouse 13.6 | 100 sur les 4 pages |
| Accessibilité / bonnes pratiques / SEO (build production) | Lighthouse 13.6 | 100 / 100 / 100 |
| LCP mobile simulé (4G lente) | Lighthouse 13.6 | accueil 2,5 s, urgence 2,6 s (objectif < 2,5 s) ; autres pages 0,9 s |

Mesures de laboratoire : les valeurs réelles (terrain) se suivent après la mise en ligne (Search Console).
Un audit manuel RGAA reste à faire (la déclaration d'accessibilité indique « non conforme » d'ici là).
Aperçu cliquable relatif : `python3 ../_outils/apercu_relatif.py dist <sortie>`.
