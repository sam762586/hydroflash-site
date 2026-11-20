// @ts-check
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

/**
 * Garde-fou : une entité HTML écrite dans une PROPRIÉTÉ de composant (titre="…&nbsp;?")
 * s'affiche telle quelle à l'écran, parce que la propriété reçoit du texte et non du
 * HTML. Le piège est invisible dans le code source et n'a été repéré que par des
 * relecteurs, deux fois. Ce contrôle arrête la construction si une page contient
 * « &amp;nbsp; » ou toute autre entité doublement échappée.
 * Dans une propriété, écrire l'espace insécable en toutes lettres : {'…\u00a0?'}.
 */
const entitesVisibles = {
  name: 'hydroflash-entites-visibles',
  hooks: {
    'astro:build:done': ({ dir, logger }) => {
      const racine = fileURLToPath(dir);
      const motif = /&amp;(?:[a-zA-Z][a-zA-Z0-9]{1,8}|#\d{2,5}|#x[0-9a-fA-F]{2,5});/;
      const fautes = [];
      const parcourir = (d) => {
        for (const e of fs.readdirSync(d, { withFileTypes: true })) {
          const p = path.join(d, e.name);
          if (e.isDirectory()) parcourir(p);
          else if (e.name.endsWith('.html')) {
            const t = fs.readFileSync(p, 'utf8');
            const m = motif.exec(t);
            if (m) {
              const extrait = t.slice(Math.max(0, m.index - 60), m.index + 30).replace(/\s+/g, ' ');
              fautes.push(`${path.relative(racine, p)} : ${m[0]} — « …${extrait}… »`);
            }
          }
        }
      };
      parcourir(racine);
      if (fautes.length) {
        logger.error('Entité HTML affichée en clair (propriété de composant recevant du texte) :');
        for (const f of fautes) logger.error('  ' + f);
        throw new Error(`${fautes.length} entité(s) HTML visible(s) à l'écran — corriger avant mise en ligne.`);
      }
    },
  },
};

// Domaine confirmé : hydroflash.fr (version canonique sans www ; www → redirection 301 dans .htaccess).
const SITE = process.env.SITE_URL || 'https://hydroflash.fr';

export default defineConfig({
  site: SITE,
  output: 'static',
  trailingSlash: 'always',
  build: { format: 'directory', inlineStylesheets: 'never', assets: 'assets' },
  compressHTML: true,
  devToolbar: { enabled: false },
  server: { host: '127.0.0.1', port: 4321 },
  integrations: [
    entitesVisibles,
    sitemap({
      filter: (page) => !/\/(contact\/merci|404)\/?$/.test(page),
      // lastmod : Google s'en sert pour decider quoi recrawler en priorite.
      // Sans date, il repasse au hasard et une page corrigee peut rester
      // desindexee des semaines.
      lastmod: new Date(),
      // L'accueil, l'urgence et les tarifs sont les pages qui doivent etre
      // explorees le plus souvent ; les mentions legales, le moins.
      serialize: (item) => {
        const u = item.url;
        if (/\/(mentions-legales|confidentialite|cookies|accessibilite|plan-du-site)\//.test(u)) {
          return { ...item, changefreq: 'yearly', priority: 0.2 };
        }
        if (/\/(urgence-debouchage-24h|tarifs|contact)\//.test(u)) {
          return { ...item, changefreq: 'weekly', priority: 0.9 };
        }
        if (/\/conseils\//.test(u)) return { ...item, changefreq: 'monthly', priority: 0.5 };
        if (/\/zones-intervention\/[a-z-]+-\d{5}\//.test(u)) {
          return { ...item, changefreq: 'monthly', priority: 0.7 };
        }
        // Accueil
        if (/^https?:\/\/[^/]+\/$/.test(u)) return { ...item, changefreq: 'weekly', priority: 1.0 };
        return { ...item, changefreq: 'monthly', priority: 0.6 };
      },
    }),
  ],
  vite: { build: { assetsInlineLimit: 0 } },
});
