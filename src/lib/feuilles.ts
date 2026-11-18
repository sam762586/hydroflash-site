/** Feuilles de style des gabarits (URL hachées, chargées avec media dans Base.astro). */
import contenuOrdi from '../styles/contenu-ordinateur.css?url';
import contenuMobile from '../styles/contenu-mobile.css?url';
import urgenceOrdi from '../styles/urgence-ordinateur.css?url';
import urgenceMobile from '../styles/urgence-mobile.css?url';
export const FEUILLE_CONTENU = { ordi: contenuOrdi, mobile: contenuMobile };
export const FEUILLE_URGENCE = { ordi: urgenceOrdi, mobile: urgenceMobile };
