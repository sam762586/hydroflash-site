/**
 * SOURCE UNIQUE des informations HYDROFLASH.
 * Règle projet : aucune information inventée. Une valeur `null` = NON CONFIRMÉE :
 *  - en préproduction, elle s'affiche avec l'étiquette « à confirmer » (composant <Tbc>) ;
 *  - en production (HF_ENV=production), le bloc concerné est masqué et
 *    `npm run verifier` liste ce qui manque (et bloque si c'est obligatoire).
 * Dernière mise à jour des confirmations : 18/11/2026.
 */
export const entreprise = {
  nom: 'HYDROFLASH',
  slogan: 'Assainissement, débouchage et curage de canalisations.',

  // ——— Confirmé ———
  telephone: { affiche: '07 62 88 28 39', lien: 'tel:+33762882839', international: '+33762882839' },
  email: 'contact@hydroflash.fr',
  disponibilite: { libelle: '24\u00a0h/24, 7\u00a0j/7', court: '24\u00a0h/24 · 7\u00a0j/7' }, // espaces insécables
  sansMajoration: true, // de nuit ni de week-end
  rappel: 'immédiat', // demande « Être rappelé »
  zone: {
    libelle: 'Seine-Maritime (76) et Eure (27)',
    departements: [
      { code: '76', nom: 'Seine-Maritime', slug: 'seine-maritime-76' },
      { code: '27', nom: 'Eure', slug: 'eure-27' },
    ],
  },
  passageCamera: { livrable: 'Les photos de l\'inspection vous sont remises sur clé USB.' },
  vehicule: { type: 'Pick-up à caisson', couleur: 'RAL 2009', marquage: 'à venir' },

  // ——— Non confirmé (null) ———
  siteUrl: 'https://hydroflash.fr' as string | null, // confirmé le 18/11/2026 (version sans www ; www redirigé)
  adresse: null as null | { rue: string; cp: string; ville: string }, // base / dépôt
  accueilClients: null as boolean | null,
  raisonSociale: null as string | null,
  formeJuridique: null as string | null,
  capital: null as string | null,
  siret: null as string | null,
  rcsOuRm: null as string | null,
  tvaIntracom: null as string | null,
  directeurPublication: null as string | null,
  mediateur: null as null | { nom: string; adresse: string; site: string },
  hebergeur: null as null | { nom: string; adresse: string; telephone: string },
  assuranceRcPro: null as string | null,
  delaiIntervention: null as string | null, // jamais affiché sans confirmation
  devisAvantIntervention: null as boolean | null,
  principeFacturation: null as string | null,
  typesOuvragesPompage: null as string | null,
  materiel: null as null | { hautePression?: string; camera?: string; pompage?: string },
  dureeConservationDemandes: null as string | null, // RGPD : à définir
  googleBusinessProfile: null as string | null,
};

/** Champs obligatoires pour une mise en ligne (mentions légales LCEN, NAP) */
export const champsObligatoiresProduction = [
  'siteUrl', 'raisonSociale', 'formeJuridique', 'siret', 'rcsOuRm', 'adresse', 'directeurPublication', 'hebergeur', 'mediateur', 'dureeConservationDemandes',
] as const;
