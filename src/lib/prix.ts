/** Calculs de prix communs (grille tarifaire, calculateur). Source unique : entreprise.tarifs. */
import { entreprise as e } from '../data/entreprise';

export type Prestation = (typeof e.tarifs.prestations)[number];

/** Taux normal (20 %). */
export const TVA_NORMALE = e.tarifs.tvaPct;

/** Le taux réduit n'est appliqué que s'il a été confirmé par le comptable (tvaReduiteConfirmee === true). */
export const tvaReduiteActive = e.tarifs.tvaReduiteConfirmee === true;

/** Prestation éligible au taux réduit (liste BOFiP), indépendamment de la confirmation. */
export const eligibleTvaReduite = (p: Prestation) => 'tvaReduite' in p && p.tvaReduite === true;

/** Taux appliqué à un particulier dont le logement est achevé depuis plus de deux ans. */
export const tauxParticulier = (p: Prestation) => (tvaReduiteActive && eligibleTvaReduite(p) ? e.tarifs.tvaReduitePct : TVA_NORMALE);

/** Montant TTC arrondi au centime. */
export const ttc = (ht: number, taux: number) => Math.round(ht * (1 + taux / 100) * 100) / 100;

/** 1 234,50 € — espace insécable avant l'euro, virgule décimale. */
export const eur = (v: number) =>
  v.toLocaleString('fr-FR', { minimumFractionDigits: v % 1 ? 2 : 0, maximumFractionDigits: 2 }) + ' €';
