// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

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
