/** Navigation. Les rubriques sans contenu réel (Réalisations) ne sont pas liées (règle : pas de page vide). */
export const nav = {
  urgence: { href: '/urgence-debouchage-24h/', label: 'Urgence 24 h/24' },
  principal: [
    { href: '/services/', label: 'Services' },
    { href: '/tarifs/', label: 'Tarifs' },
    { href: '/zones-intervention/', label: 'Zones d\'intervention' },
    { href: '/professionnels/', label: 'Professionnels' },
    { href: '/a-propos/', label: 'À propos' },
    { href: '/conseils/', label: 'Conseils' },
    { href: '/contact/', label: 'Contact' },
  ],
  legal: [
    { href: '/mentions-legales/', label: 'Mentions légales' },
    { href: '/confidentialite/', label: 'Politique de confidentialité' },
    { href: '/cookies/', label: 'Cookies' },
    { href: '/plan-du-site/', label: 'Plan du site' },
    { href: '/accessibilite/', label: 'Accessibilité' },
  ],
};
