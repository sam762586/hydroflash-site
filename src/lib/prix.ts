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

/** Règle d'application de la TVA à 10 %, telle qu'elle est affichée sur le site (calculateur, tarifs, communes).
 *  Sources : CGI art. 279-0 bis ; BOFiP BOI-ANNX-000210 ; loi de finances pour 2025 (mention du client sur le
 *  devis ou la facture, en vigueur depuis le 16/02/2025). Le taux dépend du local, pas de la qualité du client. */
const R = e.tarifs.tvaReduitePct;
const N = e.tarifs.tvaPct;
export const regleTva = {
  /** Étiquette courte, après un prix. */
  court: `TVA à ${R} % pour un logement achevé depuis plus de 2 ans`,
  /** Conditions, en une phrase. */
  conditions: `La TVA est à ${R} % pour le débouchage, le curage, le détartrage et le nettoyage des bacs à graisse dans un logement achevé depuis plus de deux ans, que vous en soyez propriétaire, locataire, bailleur ou syndic.`,
  /** Justificatif demandé au client. */
  justificatif: `Vous le certifiez par une simple mention sur le devis ou la facture.`,
  /** Cas facturés au taux normal. */
  sinon: `Logement de moins de deux ans, local professionnel, pompage, inspection caméra ou diagnostic seuls : TVA à ${N} %.`,
};
