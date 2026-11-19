/* Communes couvertes par une page dédiée.
   Populations : INSEE, populations légales — reprises telles quelles des pages
   départementales (src/pages/zones-intervention/seine-maritime-76.astro et eure-27.astro).
   `zone` renvoie à la grille tarifaire (entreprise.tarifs.zones) :
     'A'  → Rouen et 20 km autour
     'B'  → au-delà de 20 km
     'AB' → à la limite des deux : la zone est confirmée au téléphone selon l'adresse. */

export type Commune = {
  nom: string;
  slug: string;
  cp: string;
  dep: '76' | '27';
  population: number;
  bassin: string;
  zone: 'A' | 'B' | 'AB';
  /** Dominante de l'habitat, qui oriente le type d'intervention. */
  tissu: 'urbain' | 'periurbain' | 'bourg';
};

export const communes: Commune[] = [
  // ---- Agglomération de Rouen : zone A ----
  { nom: 'Rouen',                    slug: 'rouen',                    cp: '76000', dep: '76', population: 117662, bassin: 'Agglomération de Rouen', zone: 'A',  tissu: 'urbain' },
  { nom: 'Saint-Étienne-du-Rouvray', slug: 'saint-etienne-du-rouvray', cp: '76800', dep: '76', population: 29518,  bassin: 'Agglomération de Rouen', zone: 'A',  tissu: 'urbain' },
  { nom: 'Sotteville-lès-Rouen',     slug: 'sotteville-les-rouen',     cp: '76300', dep: '76', population: 29003,  bassin: 'Agglomération de Rouen', zone: 'A',  tissu: 'urbain' },
  { nom: 'Le Grand-Quevilly',        slug: 'le-grand-quevilly',        cp: '76120', dep: '76', population: 25789,  bassin: 'Agglomération de Rouen', zone: 'A',  tissu: 'urbain' },
  { nom: 'Le Petit-Quevilly',        slug: 'le-petit-quevilly',        cp: '76140', dep: '76', population: 22208,  bassin: 'Agglomération de Rouen', zone: 'A',  tissu: 'urbain' },
  { nom: 'Mont-Saint-Aignan',        slug: 'mont-saint-aignan',        cp: '76130', dep: '76', population: 20165,  bassin: 'Agglomération de Rouen', zone: 'A',  tissu: 'periurbain' },
  { nom: 'Barentin',                 slug: 'barentin',                 cp: '76360', dep: '76', population: 12022,  bassin: 'Pays de Caux intérieur', zone: 'A',  tissu: 'periurbain' },

  // ---- Boucle d'Elbeuf et Pont-de-l'Arche : zone A (confirmé par Samuel le 19/11/2026) ----
  { nom: 'Elbeuf',                   slug: 'elbeuf',                   cp: '76500', dep: '76', population: 15474,  bassin: "Boucle d'Elbeuf",        zone: 'A',  tissu: 'urbain' },
  { nom: 'Caudebec-lès-Elbeuf',      slug: 'caudebec-les-elbeuf',      cp: '76320', dep: '76', population: 10476,  bassin: "Boucle d'Elbeuf",        zone: 'A',  tissu: 'periurbain' },
  { nom: 'Saint-Aubin-lès-Elbeuf',   slug: 'saint-aubin-les-elbeuf',   cp: '76410', dep: '76', population: 8443,   bassin: "Boucle d'Elbeuf",        zone: 'A',  tissu: 'periurbain' },
  { nom: "Pont-de-l'Arche",          slug: 'pont-de-l-arche',          cp: '27340', dep: '27', population: 4133,   bassin: 'Vallée de Seine',        zone: 'A',  tissu: 'bourg' },

  // ---- Seine-Maritime, zone B ----
  { nom: 'Le Havre',                 slug: 'le-havre',                 cp: '76600', dep: '76', population: 166687, bassin: 'Agglomération du Havre', zone: 'B',  tissu: 'urbain' },
  { nom: 'Dieppe',                   slug: 'dieppe',                   cp: '76200', dep: '76', population: 28496,  bassin: "Côte d'Albâtre",         zone: 'B',  tissu: 'urbain' },
  { nom: 'Fécamp',                   slug: 'fecamp',                   cp: '76400', dep: '76', population: 17313,  bassin: "Côte d'Albâtre",         zone: 'B',  tissu: 'urbain' },
  { nom: 'Montivilliers',            slug: 'montivilliers',            cp: '76290', dep: '76', population: 15478,  bassin: 'Agglomération du Havre', zone: 'B',  tissu: 'periurbain' },
  { nom: 'Bolbec',                   slug: 'bolbec',                   cp: '76210', dep: '76', population: 11590,  bassin: 'Estuaire et vallée du Commerce', zone: 'B', tissu: 'bourg' },
  { nom: 'Yvetot',                   slug: 'yvetot',                   cp: '76190', dep: '76', population: 11438,  bassin: 'Pays de Caux intérieur', zone: 'B',  tissu: 'bourg' },
  { nom: 'Lillebonne',               slug: 'lillebonne',               cp: '76170', dep: '76', population: 8541,   bassin: 'Estuaire et vallée du Commerce', zone: 'B', tissu: 'bourg' },

  // ---- Eure, zone B ----
  { nom: 'Évreux',                   slug: 'evreux',                   cp: '27000', dep: '27', population: 49360,  bassin: "Agglomération d'Évreux", zone: 'B',  tissu: 'urbain' },
  { nom: 'Vernon',                   slug: 'vernon',                   cp: '27200', dep: '27', population: 25290,  bassin: 'Vallée de Seine',        zone: 'B',  tissu: 'urbain' },
  { nom: 'Louviers',                 slug: 'louviers',                 cp: '27400', dep: '27', population: 18705,  bassin: 'Vallée de Seine',        zone: 'B',  tissu: 'urbain' },
  { nom: 'Val-de-Reuil',             slug: 'val-de-reuil',             cp: '27100', dep: '27', population: 13245,  bassin: 'Vallée de Seine',        zone: 'B',  tissu: 'periurbain' },
  { nom: 'Gisors',                   slug: 'gisors',                   cp: '27140', dep: '27', population: 12410,  bassin: 'Vexin normand',          zone: 'B',  tissu: 'bourg' },
  { nom: 'Pont-Audemer',             slug: 'pont-audemer',             cp: '27500', dep: '27', population: 10023,  bassin: "Ouest de l'Eure",        zone: 'B',  tissu: 'bourg' },
  { nom: 'Bernay',                   slug: 'bernay',                   cp: '27300', dep: '27', population: 9765,   bassin: "Ouest de l'Eure",        zone: 'B',  tissu: 'bourg' },
  { nom: 'Les Andelys',              slug: 'les-andelys',              cp: '27700', dep: '27', population: 7706,   bassin: 'Vallée de Seine',        zone: 'B',  tissu: 'bourg' },
];

/** Les autres communes de la même intercommunalité, pour le maillage interne. */
export const voisines = (c: Commune) =>
  communes.filter((x) => x.slug !== c.slug && x.bassin === c.bassin);

/** À défaut de voisines dans le même bassin, les plus proches du même département. */
export const memeDepartement = (c: Commune) =>
  communes.filter((x) => x.slug !== c.slug && x.dep === c.dep).slice(0, 6);
