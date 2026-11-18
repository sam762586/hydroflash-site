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
    }),
  ],
  vite: { build: { assetsInlineLimit: 0 } },
});
