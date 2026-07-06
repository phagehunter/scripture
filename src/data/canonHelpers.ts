import canonData from './canon.json';
import type { Volume } from '../types';

export interface CanonBook {
  slug: string;
  title: string;
  volume: Volume;
  chapters: number;
  verses: number;
  order: number;
}

export const CANON: CanonBook[] = canonData as CanonBook[];

export const BOOK_BY_SLUG: Record<string, CanonBook> = Object.fromEntries(
  CANON.map((b) => [b.slug, b]),
);
export const BOOK_BY_TITLE: Record<string, CanonBook> = Object.fromEntries(
  CANON.map((b) => [b.title, b]),
);

export const VOLUME_LABELS: Record<Volume, string> = {
  ot: 'Old Testament',
  nt: 'New Testament',
  bom: 'Book of Mormon',
  pgp: 'Pearl of Great Price',
};

export const VOLUME_COLORS: Record<Volume, string> = {
  ot: '#fbbf24', // amber
  nt: '#38bdf8', // sky
  bom: '#34d399', // emerald
  pgp: '#c084fc', // purple
};

/**
 * Parse a human citation ("2 Nephi 12–24", "Mosiah 14:1-12", "Psalms 23")
 * into a reader location, including the starting verse when present.
 * Returns null if the book isn't in the canon.
 */
export function parseCitation(ref: string): { slug: string; chapter: number; verse?: number } | null {
  const m = ref.trim().match(/^(.*?)\s+(\d+)(?::(\d+))?/);
  const title = m ? m[1].trim() : ref.trim();
  const book = BOOK_BY_TITLE[title];
  if (!book) return null;
  const chapter = m ? Math.min(Number(m[2]), book.chapters) : 1;
  const verse = m?.[3] ? Number(m[3]) : undefined;
  return { slug: book.slug, chapter, verse };
}
