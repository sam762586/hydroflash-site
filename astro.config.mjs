// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Domaine : à confirmer par HYDROFLASH (variable SITE_URL au build). Valeur provisoire ci-dessous.
const SITE = process.env.SITE_URL || 'https://www.hydroflash.fr';

export default defineConfig({
  site: SITE,
  output: 'static',
  trailingSlash: 'always',
  build: { format: 'directory', inlineStylesheets: 'never', assets: 'assets' },
  compressHTML: true,
  integrations: [
    sitemap({
      filter: (page) => !/\/(contact\/merci|404)\/?$/.test(page),
    }),
  ],
  vite: { build: { assetsInlineLimit: 0 } },
});
