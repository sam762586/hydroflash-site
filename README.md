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
| `src/components/` | `SousHero`, `Breadcrumb` (+ JSON-LD), `Faq`, `ContactCta`, `FormulaireDemande`, `Tbc`, `JsonLd`… |
| `src/data/` | `entreprise.ts` (source unique), `services.ts`, `navigation.ts` |
| `src/content/` | Markdown éditable : `prestations/`, `conseils/` (schémas : `src/content.config.ts`) |
| `public/js/hf.js` | menu, barre d'appel, « Être rappelé », vérificateur de code postal, envoi des formulaires |
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
