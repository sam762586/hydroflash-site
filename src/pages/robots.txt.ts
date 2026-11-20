import type { APIRoute } from 'astro';
import { PROD, SITE_URL } from '../lib/env';
import { entreprise as e } from '../data/entreprise';
/** Production : tout autoriser sauf /admin/ et le script de formulaire. Préproduction : tout interdire. */
export const GET: APIRoute = () => {
  const base = e.siteUrl || SITE_URL;
  const body = PROD
    ? `User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /api/\nDisallow: /mesure/\nDisallow: /envoi-demande.php\nDisallow: /contact/merci/\n\nSitemap: ${new URL('/sitemap-index.xml', base).href}\n`
    : `# Préproduction : indexation interdite\nUser-agent: *\nDisallow: /\n`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
