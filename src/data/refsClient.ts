/** Client for the extracted cross-reference corpus (public/refs/<slug>.json). */

export interface VerseRefs {
  /** Official footnote references (editorially curated). */
  f: string[];
  /** Phrase-concordance matches (mechanical, generous). */
  p: string[];
}

export type BookRefs = Record<string, VerseRefs>; // "ch:v" → refs

const cache = new Map<string, Promise<BookRefs>>();

export function loadRefs(slug: string): Promise<BookRefs> {
  if (!cache.has(slug)) {
    cache.set(
      slug,
      fetch(`${import.meta.env.BASE_URL}refs/${slug}.json`)
        .then((r) => (r.ok ? r.json() : {}))
        .catch(() => ({})),
    );
  }
  return cache.get(slug)!;
}
