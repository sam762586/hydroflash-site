/** Prestations — ordre du marquage du véhicule (choix HYDROFLASH), puis entretien des réseaux et des pompes de relevage. */
export type Service = {
  slug: string; url: string; titre: string; court: string; picto: string; resume: string; numero: string;
  typeFormulaire?: string; // libellé dans le champ « Type de problème » (par défaut : court)
};
export const services: Service[] = [
  { numero: '01', slug: 'debouchage', url: '/debouchage-canalisation/', titre: 'Débouchage de canalisation', court: 'Débouchage', picto: 'debouchage', typeFormulaire: 'Bouchon',
    resume: 'Évier, WC, douche, colonne ou branchement : nous localisons le bouchon et rétablissons l\'écoulement.' },
  { numero: '02', slug: 'curage', url: '/curage-canalisation/', titre: 'Curage de canalisation', court: 'Curage', picto: 'curage',
    resume: 'Nettoyage en profondeur des canalisations à l\'eau sous haute pression pour retirer graisses, dépôts et sédiments.' },
  { numero: '03', slug: 'detartrage', url: '/detartrage-canalisation/', titre: 'Détartrage de canalisation', court: 'Détartrage', picto: 'detartrage',
    resume: 'Retrait mécanique des dépôts calcaires et des concrétions qui réduisent le diamètre utile de vos conduites.' },
  { numero: '04', slug: 'passage-camera', url: '/inspection-camera-canalisation/', titre: 'Passage caméra', court: 'Passage caméra', picto: 'inspection-camera',
    resume: 'Inspection vidéo de la canalisation pour localiser le bouchon ou le défaut et contrôler le résultat. Rapport PDF transmis par e\u2011mail.' },
  { numero: '05', slug: 'pompage', url: '/pompage-vidange/', titre: 'Pompage', court: 'Pompage', picto: 'pompage',
    resume: 'Pompage et vidange de regards, bacs et ouvrages d\'assainissement.' },
  { numero: '06', slug: 'entretien', url: '/entretien-reseaux-assainissement/', titre: 'Entretien des réseaux', court: 'Entretien des réseaux', picto: 'entretien',
    resume: 'Interventions préventives planifiées pour limiter les bouchons et préserver vos installations.' },
  { numero: '07', slug: 'pompes-relevage', url: '/entretien-pompe-de-relevage/', titre: 'Entretien de pompes de relevage', court: 'Pompes de relevage', picto: 'pompe-relevage', typeFormulaire: 'Pompe de relevage',
    resume: 'Nettoyage du poste, contrôle des flotteurs et du clapet anti-retour, essai de fonctionnement\u00a0: sur devis.' },
];

/** Nombre de prestations en toutes lettres, avec majuscule (« Sept ») : titres de section. */
const EN_LETTRES = ['Zéro', 'Une', 'Deux', 'Trois', 'Quatre', 'Cinq', 'Six', 'Sept', 'Huit', 'Neuf', 'Dix'];
export const nbPrestationsLettres = EN_LETTRES[services.length] ?? String(services.length);
