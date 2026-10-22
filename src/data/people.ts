import type { Person } from '../types';
import raw from '../../data/people.json';

/**
 * Curated character catalogue (~140 figures + collectives) spanning the
 * King James Old & New Testaments and the Book of Mormon.
 *
 * DISAMBIGUATION: homonymous figures carry subscript numbering following the
 * standard convention used in the chronology charts bundled with the source
 * dataset (Alma₁ the elder / Alma₂ the younger; Nephi₁ son of Lehi, Nephi₂
 * son of Helaman₃, Nephi₃ the disciple; Moroni₁ the captain / Moroni₂ the
 * son of Mormon, etc.). Every entry's `disambiguator` states parentage or
 * office so no two same-named figures can be confused.
 *
 * Collectives (peoples, movements, councils) are aggregate nodes to keep the
 * network legible across ~1,500 years and two hemispheres.
 */
export const PEOPLE: Person[] = raw as Person[];
export const PERSON_BY_ID: Record<string, Person> = Object.fromEntries(PEOPLE.map((p) => [p.id, p]));
