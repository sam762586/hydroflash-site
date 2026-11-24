/**
 * Galerie « Ce qu'on a trouvé » (accueil).
 *
 * RÈGLES (projet HYDROFLASH) :
 *  - UNIQUEMENT des photos ou captures caméra RÉELLES d'interventions HYDROFLASH ;
 *  - prises avec l'accord du client ; ni adresse, ni plaque, ni visage, ni nom visible ;
 *  - jamais de photo libre de droits présentée comme une intervention.
 * Liste vide (ou moins de 3 éléments) : section masquée en production, emplacements « à fournir » en préproduction.
 *
 * Ajouter une photo :
 *  1. déposer le fichier dans src/assets/trouvailles/ (JPEG ou WebP, 1600 px de large suffisent) ;
 *  2. l'importer ici :  import racines from '../assets/trouvailles/racines-sotteville.jpg';
 *  3. ajouter une entrée :
 *     { image: racines, alt: 'Racines ayant envahi une canalisation, vue de la caméra d’inspection',
 *       titre: 'Des racines dans le branchement', texte: 'Curage puis contrôle caméra : écoulement rétabli.',
 *       commune: 'Sotteville-lès-Rouen', mois: 'mars 2027' },
 */
import type { ImageMetadata } from 'astro';

export type Trouvaille = {
  image: ImageMetadata;
  alt: string;      // description de ce que montre l'image (accessibilité)
  titre: string;    // ce qu'on a trouvé
  texte: string;    // ce qu'on a fait
  commune?: string; // facultatif : commune seulement, jamais l'adresse
  mois?: string;    // facultatif : « mars 2027 »
};

export const trouvailles: Trouvaille[] = [];

/** Nombre minimal de photos pour afficher la section en production. */
export const TROUVAILLES_MIN = 3;
