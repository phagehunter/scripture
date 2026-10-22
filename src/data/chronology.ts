import type { ChronEvent } from '../types';
import raw from '../../data/chronology.json';

/**
 * Timeline events for the parallel-chronology view. Old-World dates before
 * the monarchy follow traditional biblical reckoning (flagged approximate);
 * Book of Mormon dates follow the text's internal year-counts as compiled in
 * the chronology charts included with the source dataset. Negative = BC.
 */
export const CHRON_EVENTS: ChronEvent[] = raw as ChronEvent[];
