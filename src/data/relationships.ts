import type { Relationship } from '../types';
import raw from '../../data/relationships.json';

/**
 * Typed relationship ledger (~240 edges). Edge types:
 *  family · succession · teaches · conflict · alliance · divine · vision · quotes
 * `vision` and `quotes` edges frequently cross volumes and centuries — they are
 * what makes this canon's network different from a single-work network:
 * Nephi₁ sees Mary and John the Beloved six centuries early; Abinadi exposits
 * Isaiah 53 in a New-World courtroom; the risen Christ dictates Malachi to a
 * people who left Jerusalem before Malachi wrote.
 */
export const RELATIONSHIPS: Relationship[] = raw as Relationship[];
export const ALL_RELATIONSHIPS: Relationship[] = RELATIONSHIPS;
