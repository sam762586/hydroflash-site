/** Collections de contenus (Markdown) — format compatible avec un CMS « git » (Decap/Sveltia) ajouté plus tard. */
import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';

const faq = z.array(z.object({ q: z.string(), a: z.string() })).default([]);

const prestations = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/prestations' }),
  schema: z.object({
    ordre: z.number(),
    slug: z.string(),                 // segment d'URL à la racine, ex. « debouchage-canalisation »
    titreCourt: z.string(),           // libellé de menu
    seoTitre: z.string().max(70),
    seoDescription: z.string().max(170),
    h1a: z.string(), h1b: z.string().optional(),
    intro: z.string(),
    picto: z.string(),
    symptomes: z.array(z.string()).default([]),
    etapes: z.array(z.object({ titre: z.string(), texte: z.string() })).default([]),
    faq,
    liees: z.array(z.string()).default([]), // slugs de prestations liées
  }),
});

const conseils = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/conseils' }),
  schema: z.object({
    titre: z.string(), seoTitre: z.string().max(70), seoDescription: z.string().max(170),
    resume: z.string(), date: z.coerce.date(),
    relu: z.boolean().default(false), // publié en production seulement si relu par HYDROFLASH
    prestationsLiees: z.array(z.string()).default([]),
  }),
});

export const collections = { prestations, conseils };
