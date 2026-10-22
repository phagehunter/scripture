import type { CrossRef } from '../types';
import raw from '../../data/crossrefs.json';

/**
 * Curated intertextual cross-references (~60), drawn in the arc diagram.
 * Directions run source → target in order of composition/quotation:
 * OT → NT (quotation & fulfillment), OT → BoM (brass-plates quotation),
 * NT ↔ BoM (parallel sermons, shared grants), and BoM → OT (allusion).
 *
 * Weight ≈ scale of the borrowing (1 = a verse or image, 5 = whole chapters).
 */
export const CROSSREFS: CrossRef[] = raw as CrossRef[];
