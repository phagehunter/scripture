import type { Volume } from '../types';

export interface BookText {
  volume: Volume;
  title: string;
  slug: string;
  chapters: string[][];
}

const cache = new Map<string, Promise<BookText>>();

/** Fetch a book's text (public/text/<slug>.json), cached per session. */
export function loadBook(slug: string): Promise<BookText> {
  if (!cache.has(slug)) {
    cache.set(
      slug,
      fetch(`${import.meta.env.BASE_URL}text/${slug}.json`).then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      }),
    );
  }
  return cache.get(slug)!;
}
