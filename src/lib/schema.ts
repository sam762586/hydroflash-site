/** Données structurées (schema.org) générées depuis la source unique — uniquement des données confirmées. */
import { entreprise as e } from '../data/entreprise';
import { SITE_URL } from './env';

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
  };
}

export function schemaService(nom: string, chemin: string, description: string) {
  return {
    '@context': 'https://schema.org', '@type': 'Service', name: nom, serviceType: nom, description, url: url(chemin),
    provider: { '@id': url('/#entreprise') },
    areaServed: e.zone.departements.map((d) => ({ '@type': 'AdministrativeArea', name: `${d.nom} (${d.code})` })),
  };
}
