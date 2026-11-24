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
  /** Décision du 24/11/2026 : PARTICULIERS = même prix à toute heure (aucune majoration la nuit, le week-end ni
      les jours fériés). Professionnels (syndics, cabinets immobiliers, entreprises) : AUCUN PRIX PRO SUR LE SITE (démarchage
      direct avec plaquettes et devis ; majorations hors heures ouvrées). Ne jamais écrire « sans majoration » sans
      préciser « pour les particuliers » (pratique trompeuse, y compris envers un pro). */
  sansMajorationParticuliers: true,

  /** Grille tarifaire HYDROFLASH (confirmée le 19/11/2026, mise à jour le 24/11/2026 : débouchage manuel 110/135 € HT,
      hydrocureur 227,27/257,27 € HT soit 250 € TTC à 10 % en zone A, caméra sans rapport et bac à graisse retirés,
      entretien de pompe de relevage ajouté sur devis). Prix HT, base de calcul des prix TTC PARTICULIERS affichés
      sur le site (valables à toute heure). Les montants HT ne sont jamais affichés : pas de prix pros sur le site. */
  tarifs: {
    /** Phrase affichée là où un professionnel cherche un prix (tarifs, calculateur, pages pros). */
    tarifsPro: 'Professionnels (syndics, cabinets immobiliers, entreprises)\u00a0: tarifs sur devis.',
    tvaPct: 20,
    /** TVA à 10 % (CGI, art. 279-0 bis) : débouchage, détartrage et curage de canalisations, curage de réseaux
        privés, nettoyage de bacs à graisse (BOFiP BOI-ANNX-000210 du 31/07/2024), dans des LOCAUX D'HABITATION
        ACHEVÉS DEPUIS PLUS DE DEUX ANS. C'est le local qui compte, pas le client : propriétaire, locataire,
        bailleur ou syndic de copropriété y ont droit. Justificatif : depuis le 16/02/2025 (loi de finances
        pour 2025), le client certifie les conditions par une mention sur le devis ou la facture (plus de
        formulaire 1300-SD / 1301-SD) ; l'entreprise garde une copie en comptabilité.
        Restent à 20 % : inspection caméra et diagnostic facturés seuls (prestations d'études), pompage
        (à revoir avec le comptable : vidange de fosse septique et nettoyage de puisard sont à 10 % au BOFiP).
        Validée par HYDROFLASH le 24/11/2026. Les prestations concernées portent `tvaReduite: true` ci-dessous. */
    tvaReduitePct: 10,
    tvaReduiteConfirmee: true as boolean | null,
    zones: [
      { code: 'A', libelle: 'Rouen et 20\u00a0km autour' },
      { code: 'B', libelle: 'Au-delà de 20\u00a0km de Rouen' },
    ],
    /** a = prix HT zone A, b = prix HT zone B, null = sur devis.
        tvaReduite = prestation listée au taux de 10 % par le BOFiP (voir tvaReduiteConfirmee). */
    prestations: [
      { cat: 'Débouchage',        nom: 'Débouchage manuel',                     unite: 'forfait', a: 110,  b: 135,  tvaReduite: true, detail: 'Pompette, furet manuel ou furet électrique. Déplacement et 1\u00a0h d\u2019intervention inclus.' },
      { cat: 'Débouchage',        nom: 'Débouchage à l\u2019hydrocureur',          unite: 'forfait', a: 227.27, b: 257.27,  tvaReduite: true, detail: 'Camion hydrocureur haute pression. Déplacement et 1\u00a0h d\u2019intervention inclus.' },
      { cat: 'Curage',            nom: 'Curage \u2013 heure de main-d\u2019œuvre',   unite: 'heure',   a: 210,  b: 240,  tvaReduite: true, detail: '1\u00a0h sur place avec le camion, nettoyage du réseau haute pression inclus. S\u2019ajoute au prix au mètre.' },
      { cat: 'Curage',            nom: 'Curage \u2013 par mètre linéaire',         unite: 'ml',      a: 9,    b: 9,    tvaReduite: true, detail: 'Même prix dans les deux zones.' },
      { cat: 'Détartrage',        nom: 'Détartrage haute pression',             unite: '—',       a: null, b: null, tvaReduite: true, detail: 'Sur devis, selon le nombre d\u2019étages et l\u2019état du réseau, après passage caméra. Pas de détartrage la nuit, le dimanche ni les jours fériés.' },
      { cat: 'Pompage',           nom: 'Pompage eaux usées (EU)',               unite: 'forfait', a: 330,  b: 380,  detail: '1\u00a0m³ pompé, retraitement des déchets inclus. Au-delà d\u20191\u00a0m³\u00a0: coût du centre de retraitement et forfait transport.' },
      { cat: 'Pompage',           nom: 'Pompage eaux pluviales (EP)',           unite: 'forfait', a: 215,  b: 245,  detail: 'Quantité illimitée, sans retraitement.' },
      { cat: 'Pompage',           nom: 'Entretien de pompe de relevage',        unite: '—',       a: null, b: null, tvaReduite: true, detail: 'Sur devis, selon le type de poste et son accès.' },
      { cat: 'Inspection caméra', nom: 'Inspection caméra avec rapport',        unite: 'forfait', a: 250,  b: 290,  detail: 'Jusqu\u2019à 30\u00a0ml. Rapport PDF\u00a0: photos, localisation et description des défauts.' },
      { cat: 'Divers',            nom: 'Diagnostic ou déplacement seul',        unite: 'forfait', a: 125,  b: 145,  detail: 'Lorsque l\u2019intervention s\u2019avère impossible\u00a0: 1\u00a0h et trajet inclus. 30\u00a0% déduits de la facture si une intervention est réalisée dans les 30\u00a0jours.' },
    ],
    regleDemiHeure: 'Au-delà de la première heure incluse, toute demi-heure entamée est facturée 50\u00a0% du prix de la prestation.',
  },
  rappel: 'immédiat', // demande « Être rappelé »
  zone: {
    libelle: 'Seine-Maritime (76) et Eure (27)',
    departements: [
      { code: '76', nom: 'Seine-Maritime', slug: 'seine-maritime-76' },
      { code: '27', nom: 'Eure', slug: 'eure-27' },
    ],
  },
  /** Les trois fondateurs et leurs parcours (confirmé le 19/11/2026). */
  fondateurs: {
    nombre: 3,
    postes: 'techniciens, chef d\u2019équipe et responsable technique',
    equipe: [
      { nom: 'Samuel Delacourt', poste: 'Technicien de terrain et responsable technique', role: 'terrain', annees: 17 },
      { nom: 'Julien Memain',    poste: 'Technicien de terrain et chef d\u2019équipe',      role: 'terrain', annees: 18 },
      { nom: 'Souad Tliche',     poste: 'Devis, accueil téléphonique et administratif',     role: 'bureau',  annees: 4 },
    ],
    /** Expérience cumulée telle qu'elle est communiquée par HYDROFLASH (20/11/2026).
        Le total des trois parcours ci-dessus fait 39 ans ; l'entreprise arrondit à 40
        et ajoute le volume horaire. Ces deux chiffres sont ceux à afficher. */
    experience: { annees: 40, heures: 63000 },
    /** Photo de groupe : non fournie. */
    photo: null as null | string,
  },

  /** Livrable de l'inspection caméra. Confirmé le 20/11/2026 : rapport PDF par e-mail,
      clé USB seulement sur demande (auparavant : photos remises sur clé USB). */
  passageCamera: { livrable: 'Un rapport complet de l\'inspection, photos à l\'appui, vous est transmis par e\u2011mail au format PDF\u00a0; une clé USB est disponible sur demande.' },
  /** Entretien récurrent. Confirmé le 20/11/2026 : passages à fréquence définie,
      calée sur l'activité réelle du client et non sur un calendrier théorique. */
  contratEntretien: 'Passages à fréquence définie, calée sur votre activité réelle',
  /** Après un pompage, les matières partent en centre de traitement : les documents de
      suivi (bordereau de suivi des déchets) sont remis au client, à conserver dans son
      registre. Confirmé le 20/11/2026. */
  documentsPompage: 'Documents de suivi des déchets remis après chaque pompage',
  vehicule: { type: 'Pick-up à caisson', couleur: 'RAL 2009', marquage: 'à venir' },

  // ——— Non confirmé (null) ———
  siteUrl: 'https://hydroflash.fr' as string | null, // confirmé le 18/11/2026 (version sans www ; www redirigé)
  adresse: null as null | { rue: string; cp: string; ville: string }, // base / dépôt
  accueilClients: null as boolean | null,
  raisonSociale: null as string | null,
  /** Confirmé par Samuel le 19/11/2026. */
  formeJuridique: 'SARL' as string | null,
  capital: null as string | null,
  siret: null as string | null,
  rcsOuRm: null as string | null,
  tvaIntracom: null as string | null,
  /** Le gérant qui engage la publication du site. Samuel est co-gérant et porte le projet ;
      à corriger si les associés désignent quelqu'un d'autre. */
  directeurPublication: 'Samuel Delacourt' as string | null,
  mediateur: null as null | { nom: string; adresse: string; site: string },
  /** Hébergement mutualisé OVH (offre Starter, cluster129), commandé le 19/11/2026.
      Mentions relevées sur les mentions légales d'OVH ; le 1007 est le numéro attribué
      à OVH par l'Arcep pour son service client. */
  hebergeur: { nom: 'OVH SAS', adresse: '2 rue Kellermann, 59100 Roubaix, France', telephone: '1007 (ou +33 9 72 10 10 07)' } as null | { nom: string; adresse: string; telephone: string },
  assuranceRcPro: null as string | null,
  /** Délai d'arrivée. Confirmé par Samuel le 19/11/2026 : environ 30 minutes.
      Ce délai vaut pour la ZONE A seulement (Rouen et 20 km autour). Au-delà,
      Le Havre ou Bernay sont à plus de 75 km : annoncer 30 minutes partout serait
      une promesse intenable. Hors zone A, le délai est estimé au téléphone. */
  delaiZoneA: '30 minutes',
  delaiIntervention: 'Environ 30\u00a0minutes sur Rouen et 20\u00a0km autour. Au-delà, le délai vous est estimé au téléphone selon votre adresse.',
  devisAvantIntervention: true,
  /** Le devis ne coûte rien. Attention : le DÉPLACEMENT, lui, est facturé quand
      l'intervention s'avère impossible (prestation « Diagnostic ou déplacement seul »).
      Ne jamais écrire « déplacement gratuit » : ce serait faux. */
  devisGratuit: true,
  /** Moyens de paiement acceptés. Confirmé le 20/11/2026. */
  principeFacturation: 'Carte bancaire ou espèces\u00a0; virement également pour les professionnels.' as string | null,
  /** Version complète, pour les endroits où il y a la place de tout dire. */
  moyensPaiementDetail: 'Les particuliers règlent par carte bancaire ou en espèces. Les professionnels peuvent également régler par virement. Les chèques ne sont pas acceptés.',
  typesOuvragesPompage: null as string | null,
  materiel: null as null | { hautePression?: string; camera?: string; pompage?: string },
  /** Durée proposée, alignée sur la référence de la CNIL pour les prospects (3 ans après
      le dernier contact). À valider par les associés ; modifiable à tout moment. */
  dureeConservationDemandes: 'Trois ans à compter de votre dernier contact avec HYDROFLASH. Si la demande donne lieu à une intervention, les éléments nécessaires au suivi et aux obligations comptables sont conservés plus longtemps, selon les durées légales.' as string | null,
  googleBusinessProfile: null as string | null,

  // ——— Preuves de sérieux (bloc « Vérifiez-nous ») : null = non confirmé ———
  /** Agrément préfectoral de vidangeur (fosses septiques et toutes eaux), délivré pour 10 ans. */
  agrementVidangeur: null as null | { numero: string; prefecture: string },
  /** Récépissé de déclaration de transport de déchets (préfecture), valable 5 ans. */
  recepisseTransportDechets: null as null | { numero: string },
  /** Exemple de rapport caméra anonymisé (PDF déposé dans public/docs/), ex. '/docs/exemple-rapport-camera.pdf'. */
  exempleRapportPdf: null as string | null,
  /** Conditions proposées aux plombiers et chauffagistes partenaires (page /professionnels/plombiers-partenaires/).
      null tant que les associés ne les ont pas arrêtées. */
  conditionsPartenaires: null as null | string[],
};

/** Champs obligatoires pour une mise en ligne (mentions légales LCEN, NAP) */
export const champsObligatoiresProduction = [
  'siteUrl', 'raisonSociale', 'formeJuridique', 'siret', 'rcsOuRm', 'adresse', 'directeurPublication', 'hebergeur', 'mediateur', 'dureeConservationDemandes',
] as const;
