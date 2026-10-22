import type { EraDef } from '../types';
import raw from '../../data/eras.json';

/**
 * Twelve eras spanning both hemispheres of the canon, ordered by approximate
 * start date. Old-World dates before the monarchy follow traditional biblical
 * chronology and are symbolic/approximate; Book of Mormon dates follow the
 * text's internal year-counts (reckoned from Lehi's departure, the judges,
 * and the sign of Christ's birth) as compiled in the chronology charts
 * included with the source dataset.
 */
export const ERAS: EraDef[] = raw as EraDef[];
export const ERA_BY_ID: Record<number, EraDef> = Object.fromEntries(ERAS.map((e) => [e.id, e]));
