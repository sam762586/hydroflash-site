/** Données structurées (schema.org) générées depuis la source unique — uniquement des données confirmées. */
import { entreprise as e } from '../data/entreprise';
import { SITE_URL } from './env';
import { ttc, tauxParticulier } from './prix';

const url = (p = '/') => new URL(p, e.siteUrl || SITE_URL).href;

/** `ville` : sur une page de commune, on nomme la ville à Google en plus des deux
    départements. C'est ce que lit le référencement local. */
export function schemaEntreprise(ville?: { nom: string; cp: string; dep: string }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'HomeAndConstructionBusiness',
    '@id': url('/#entreprise'),
    name: e.nom,
    url: url('/'),
    logo: url('/img/logo/hf-logo.svg'),
    image: url('/og-image.jpg'),
    telephone: e.telephone.international,
    email: e.email,
    description: 'Débouchage, curage, détartrage, passage caméra, pompage et entretien des réseaux d\'assainissement, 24 h/24 et 7 j/7, en Seine-Maritime (76) et dans l\'Eure (27).',
    areaServed: [
      ...(ville ? [{ '@type': 'City', name: ville.nom, address: { '@type': 'PostalAddress', postalCode: ville.cp, addressLocality: ville.nom, addressRegion: ville.dep === '76' ? 'Seine-Maritime' : 'Eure', addressCountry: 'FR' } }] : []),
      ...e.zone.departements.map((d) => ({ '@type': 'AdministrativeArea', name: `${d.nom} (${d.code})` })),
    ],
    openingHoursSpecification: [{ '@type': 'OpeningHoursSpecification', dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'], opens: '00:00', closes: '23:59' }],
    ...(e.adresse ? { address: { '@type': 'PostalAddress', streetAddress: e.adresse.rue, postalCode: e.adresse.cp, addressLocality: e.adresse.ville, addressCountry: 'FR' } } : {}),
    ...(e.googleBusinessProfile ? { sameAs: [e.googleBusinessProfile] } : {}),
    /* Fourchette de prix : Google l'affiche dans la fiche locale. Calculée depuis la
       grille réelle, en TTC particuliers (aucun prix pro publié), du premier forfait au plus élevé. */
    priceRange: `${Math.min(...prixGrille())}\u2013${Math.max(...prixGrille())} €`,
    currenciesAccepted: 'EUR',
    slogan: e.slogan,
    /* Ce que l'entreprise sait faire : aide Google à relier le site aux requêtes métier. */
    knowsAbout: [
      'débouchage de canalisation', 'débouchage de WC', "débouchage d'évier",
      'curage de canalisation', 'hydrocurage haute pression', 'détartrage de canalisation',
      'inspection caméra de canalisation', 'inspection télévisée de réseau',
      'pompage de bac à graisse', 'pompage des eaux usées', 'pompage des eaux pluviales',
      "entretien de réseau d'assainissement", 'entretien de pompe de relevage', 'poste de relevage',
      'colonne d\'évacuation', 'assainissement',
    ],
    /* Catalogue de prestations avec leur prix d'appel : c'est ce qui permet d'apparaître
       sur les requêtes « prix débouchage » plutôt que sur la seule marque. */
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Prestations HYDROFLASH',
      itemListElement: e.tarifs.prestations
        .filter((p) => p.a !== null)
        .map((p) => ({
          '@type': 'Offer',
          itemOffered: { '@type': 'Service', name: p.nom, description: p.detail },
          price: String(ttc(p.a!, tauxParticulier(p))),
          priceCurrency: 'EUR',
          priceSpecification: {
            '@type': 'PriceSpecification',
            price: String(ttc(p.a!, tauxParticulier(p))),
            priceCurrency: 'EUR',
            valueAddedTaxIncluded: true,
          },
          availability: 'https://schema.org/InStock',
        })),
    },
  };
}

/** Prix des FORFAITS de la grille, en euros HT. Les prix à l'heure ou au mètre
    sont exclus : annoncer « à partir de 9 € » parce que le curage se facture 9 €
    le mètre laisserait croire à un dépannage à 9 €. */
function prixGrille(): number[] {
  const v: number[] = [];
  for (const p of e.tarifs.prestations) {
    if (p.unite !== 'forfait') continue;
    if (p.a !== null) v.push(ttc(p.a, tauxParticulier(p)));
    if (p.b !== null) v.push(ttc(p.b, tauxParticulier(p)));
  }
  return v;
}

/** FAQPage : une page ne doit en déclarer qu'une, avec les questions réellement affichées. */
export function schemaFaq(items: { q: string; a: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((it) => ({
      '@type': 'Question',
      name: it.q.replace(/<[^>]+>/g, ''),
      acceptedAnswer: { '@type': 'Answer', text: it.a.replace(/<[^>]+>/g, '') },
    })),
  };
}

export function schemaService(nom: string, chemin: string, description: string) {
  return {
    '@context': 'https://schema.org', '@type': 'Service', name: nom, serviceType: nom, description, url: url(chemin),
    provider: { '@id': url('/#entreprise') },
    areaServed: e.zone.departements.map((d) => ({ '@type': 'AdministrativeArea', name: `${d.nom} (${d.code})` })),
  };
}
