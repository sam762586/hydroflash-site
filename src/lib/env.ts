/** Environnement de build : préproduction par défaut (étiquettes « à confirmer » visibles, noindex). */
export const PROD = process.env.HF_ENV === 'production';
export const SITE_URL = process.env.SITE_URL || 'https://hydroflash.fr'; // domaine confirmé (sans www)
