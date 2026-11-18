import { getCollection } from 'astro:content';
import { PROD } from './env';
/** Articles publiés : en production, uniquement ceux relus par HYDROFLASH (relu: true). */
export async function conseilsPublies() {
  const tous = await getCollection('conseils');
  return tous.filter((c) => !PROD || c.data.relu).sort((a, b) => +b.data.date - +a.data.date);
}
