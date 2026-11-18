#!/usr/bin/env node
/**
 * HYDROFLASH — vérification d'une construction de PRODUCTION, avant mise en ligne.
 * À lancer après `HF_ENV=production astro build` (c'est ce que fait `npm run build:prod`), ou seul : `npm run verifier`.
 *
 * Bloquant (code de sortie 1) :
 *  (a) un champ de `champsObligatoiresProduction` (src/data/entreprise.ts) est vide (null) ;
 *  (b) dist/ contient une valeur provisoire : data-tbc, « à confirmer », « XX XX », « [À », « [VILLE] » ;
 *  (c) robots.txt absent ou bloquant tout le site (Disallow: /) ;
 *  (d) une page sans <title> ou sans meta description, ou qui en contient plusieurs ;
 *      titre ou description identique sur deux pages indexables ;
 *  (e) lien interne vers une page ou un fichier absent de dist/ ;
 *  (f) dist/ issu d'une construction de préproduction (bandeau « Préproduction ») ;
 *  (g) option du champ « Type de problème » absente de la liste blanche de envoi-demande.php.
 * Avertissements (non bloquants) : fichiers serveur manquants, security.txt expiré, page noindex inattendue.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// Dossier vérifié : dist/ par défaut, ou chemin passé en argument (node scripts/verifier-production.mjs <dossier>).
const dist = process.argv[2] ? path.resolve(process.argv[2]) : path.join(racine, 'dist');
const erreurs = [];
const avertissements = [];
const rel = (f) => path.relative(dist, f).split(path.sep).join('/');

if (!fs.existsSync(dist)) {
  console.error('✗ dist/ introuvable : lancez d\'abord `HF_ENV=production astro build`.');
  process.exit(1);
}

/* ---------- (a) Informations obligatoires de l'entreprise ---------- */
async function chargerEntreprise() {
  const fichier = path.join(racine, 'src/data/entreprise.ts');
  // Node ≥ 22.18 lit le TypeScript « effaçable » nativement : on importe le module tel quel.
  const avert = process.emitWarning;
  process.emitWarning = (w, ...a) => (String(w).includes('Type Stripping') ? undefined : avert.call(process, w, ...a));
  try {
    const m = await import(pathToFileURL(fichier).href);
    return { entreprise: m.entreprise, champs: [...m.champsObligatoiresProduction] };
  } catch {
    // Repli : lecture par expressions régulières (champ: null → manquant).
    const src = fs.readFileSync(fichier, 'utf8');
    const liste = src.match(/champsObligatoiresProduction\s*=\s*\[([\s\S]*?)\]/)?.[1] ?? '';
    const champs = [...liste.matchAll(/['"]([^'"]+)['"]/g)].map((m) => m[1]);
    const entreprise = {};
    for (const c of champs) {
      const m = src.match(new RegExp(`^\\s*${c}\\s*:\\s*(null\\b|''|"")?`, 'm'));
      entreprise[c] = !m ? undefined : m[1] ? null : 'renseigné';
    }
    return { entreprise, champs };
  } finally {
    process.emitWarning = avert;
  }
}
const estVide = (v) => v === null || v === undefined || (typeof v === 'string' && v.trim() === '')
  || (typeof v === 'object' && Object.values(v).some(estVide));
const { entreprise, champs } = await chargerEntreprise();
const manquants = champs.filter((c) => estVide(entreprise[c]));
if (manquants.length) erreurs.push(`(a) Informations obligatoires manquantes dans src/data/entreprise.ts : ${manquants.join(', ')}`);

/* ---------- Inventaire de dist/ ---------- */
const fichiers = [];
(function parcourir(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const f = path.join(d, e.name);
    if (e.isDirectory()) parcourir(f); else fichiers.push(f);
  }
})(dist);
const pages = fichiers.filter((f) => f.endsWith('.html'));
const lire = (f) => fs.readFileSync(f, 'utf8').normalize('NFC');

/* ---------- (b) Valeurs provisoires ---------- */
const motifs = [
  [/data-tbc/g, 'data-tbc'],
  [/à confirmer/gi, '« à confirmer »'],
  [/XX XX/g, '« XX XX »'],
  [/\[À/g, '« [À »'],
  [/\[VILLE\]/gi, '« [VILLE] »'],
];
for (const f of fichiers.filter((x) => /\.(html|xml|txt|json|webmanifest)$/.test(x))) {
  const texte = lire(f);
  for (const [re, nom] of motifs) {
    re.lastIndex = 0;
    const m = re.exec(texte);
    if (m) {
      const extrait = texte.slice(Math.max(0, m.index - 50), m.index + 40).replace(/\s+/g, ' ');
      erreurs.push(`(b) ${rel(f)} : ${nom} — « …${extrait}… »`);
    }
  }
}

/* ---------- (c) robots.txt ---------- */
const robots = path.join(dist, 'robots.txt');
if (!fs.existsSync(robots)) {
  erreurs.push('(c) robots.txt absent de dist/');
} else {
  const lignes = lire(robots).split(/\r?\n/).map((l) => l.replace(/#.*/, '').trim());
  let groupeTous = false;
  for (const l of lignes) {
    if (/^user-agent\s*:/i.test(l)) groupeTous = /^user-agent\s*:\s*\*\s*$/i.test(l);
    else if (groupeTous && /^disallow\s*:\s*\/\s*$/i.test(l)) { erreurs.push('(c) robots.txt bloque tout le site (Disallow: /) : construction de préproduction ?'); break; }
  }
  if (!lignes.some((l) => /^sitemap\s*:/i.test(l))) avertissements.push('robots.txt ne déclare pas de sitemap');
}

/* ---------- (d) Titres et descriptions, (e) liens internes, (f) préproduction, (g) types du formulaire ---------- */
const attr = (balise, nom) => balise.match(new RegExp(`\\s${nom}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i'))?.slice(1).find((x) => x !== undefined);
const decoder = (t) => t.replace(/&amp;/g, '&').replace(/&#39;|&#x27;|&apos;/g, '\'').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
const titres = new Map();
const descriptions = new Map();
const optionsType = new Set();
const liensCasses = new Map();
let preprod = false;

function cibleExiste(url) {
  let p;
  try { p = decodeURIComponent(url.split(/[?#]/)[0]); } catch { return false; }
  if (p === '' || p === '/') return fs.existsSync(path.join(dist, 'index.html'));
  const f = path.join(dist, p);
  if (!f.startsWith(dist)) return false;
  if (p.endsWith('/')) return fs.existsSync(path.join(f, 'index.html'));
  return (fs.existsSync(f) && fs.statSync(f).isFile()) || fs.existsSync(path.join(f, 'index.html'));
}

for (const f of pages) {
  const html = lire(f);
  const page = '/' + rel(f).replace(/index\.html$/, '');
  if (/<meta[^>]+http-equiv\s*=\s*["']?refresh/i.test(html)) continue; // page de redirection générée
  if (/class="[^"]*\bproto-band\b/.test(html)) preprod = true;
  const head = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i)?.[1] ?? '';
  const t = [...head.matchAll(/<title[^>]*>([\s\S]*?)<\/title>/gi)].map((m) => decoder(m[1]));
  const d = [...head.matchAll(/<meta\b[^>]*>/gi)].map((m) => m[0]).filter((b) => (attr(b, 'name') ?? '').toLowerCase() === 'description').map((b) => decoder(attr(b, 'content') ?? ''));
  if (t.length === 0 || t.every((x) => x === '')) erreurs.push(`(d) ${page} : <title> absent ou vide`);
  if (t.length > 1) erreurs.push(`(d) ${page} : ${t.length} balises <title>`);
  if (d.length === 0 || d.every((x) => x === '')) erreurs.push(`(d) ${page} : meta description absente ou vide`);
  if (d.length > 1) erreurs.push(`(d) ${page} : ${d.length} meta description`);
  const robotsMeta = [...head.matchAll(/<meta\b[^>]*>/gi)].map((m) => m[0]).filter((b) => (attr(b, 'name') ?? '').toLowerCase() === 'robots').map((b) => attr(b, 'content') ?? '').join(' ');
  const indexable = !/noindex/i.test(robotsMeta);
  if (!indexable && !/^\/(404\.html|contact\/merci\/)$/.test(page)) avertissements.push(`${page} est en noindex`);
  if (indexable) {
    if (t[0]) titres.set(t[0], [...(titres.get(t[0]) ?? []), page]);
    if (d[0]) descriptions.set(d[0], [...(descriptions.get(d[0]) ?? []), page]);
  }
  for (const m of html.matchAll(/\s(?:href|src)\s*=\s*(?:"([^"]*)"|'([^']*)')/gi)) {
    const url = m[1] ?? m[2];
    if (!url || !url.startsWith('/') || url.startsWith('//')) continue;
    if (!cibleExiste(url)) liensCasses.set(url.split(/[?#]/)[0], [...new Set([...(liensCasses.get(url.split(/[?#]/)[0]) ?? []), page])]);
  }
  for (const s of html.matchAll(/<select\b[^>]*\sname\s*=\s*["']?type\b[^>]*>([\s\S]*?)<\/select>/gi)) {
    for (const o of s[1].matchAll(/<option\b([^>]*)>([\s\S]*?)<\/option>/gi)) optionsType.add(decoder(attr(o[0], 'value') ?? o[2]));
  }
}
for (const [t, p] of titres) if (p.length > 1) erreurs.push(`(d) Titre identique sur ${p.length} pages (${p.join(', ')}) : « ${t} »`);
for (const [d, p] of descriptions) if (p.length > 1) erreurs.push(`(d) Description identique sur ${p.length} pages (${p.join(', ')}) : « ${d.slice(0, 80)}… »`);
for (const [url, p] of liensCasses) erreurs.push(`(e) Lien interne cassé ${url} (depuis ${p.slice(0, 4).join(', ')}${p.length > 4 ? '…' : ''})`);
if (preprod) erreurs.push('(f) Bandeau « Préproduction » présent : construire avec HF_ENV=production');

const php = path.join(dist, 'envoi-demande.php');
if (!fs.existsSync(php)) {
  avertissements.push('envoi-demande.php absent de dist/ (formulaire inopérant)');
} else if (optionsType.size) {
  const liste = fs.readFileSync(php, 'utf8').match(/const\s+HF_TYPES\s*=\s*\[([^\]]*)\]/)?.[1] ?? '';
  const types = new Set([...liste.matchAll(/'((?:[^'\\]|\\.)*)'/g)].map((m) => m[1].replace(/\\'/g, '\'').normalize('NFC')));
  const absents = [...optionsType].filter((o) => !types.has(o));
  if (absents.length) erreurs.push(`(g) Types du formulaire absents de HF_TYPES (public/envoi-demande.php) : ${absents.join(', ')}`);
}

/* ---------- Fichiers serveur ---------- */
for (const f of ['.htaccess', '404.html', '.well-known/security.txt', 'sitemap-index.xml']) {
  if (!fs.existsSync(path.join(dist, f))) avertissements.push(`${f} absent de dist/`);
}
const securite = path.join(dist, '.well-known/security.txt');
if (fs.existsSync(securite)) {
  const exp = lire(securite).match(/^Expires:\s*(\S+)/mi)?.[1];
  const jours = exp ? (Date.parse(exp) - Date.now()) / 864e5 : NaN;
  if (!(jours > 0)) erreurs.push('security.txt : date « Expires » absente ou dépassée');
  else if (jours < 30) avertissements.push(`security.txt expire dans ${Math.floor(jours)} jours : mettre à jour « Expires »`);
}

/* ---------- Résultat ---------- */
console.log(`Vérification de production — ${pages.length} pages HTML, ${fichiers.length} fichiers dans dist/`);
for (const a of avertissements) console.log(`  ! ${a}`);
if (erreurs.length) {
  console.error(`\n✗ ${erreurs.length} problème(s) bloquant(s) :`);
  for (const e of erreurs) console.error(`  ✗ ${e}`);
  console.error('\nMise en ligne refusée : corrigez puis relancez `npm run build:prod`.');
  process.exit(1);
}
console.log('\n✓ OK : aucune valeur provisoire, informations obligatoires renseignées, métadonnées et liens valides.');
