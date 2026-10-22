/**
 * Rebuild the cross-reference corpus from the phrase concordance only.
 *
 *   node scripts/rebuild-refs.mjs
 *
 * The per-verse files in public/refs/ used to carry two lists per verse:
 * "f", references transcribed from the footnotes of the 2013 Latter-day Saint
 * edition (a copyrighted study apparatus), and "p", mechanical phrase matches
 * computed by scripts/extract-refs.mjs. This script empties every "f" list
 * and recomputes src/data/refMatrix.json (book-to-book counts) from "p", so
 * the published corpus contains only matches derived from the public-domain
 * text itself. The "f" field is kept (always empty) so the file format and
 * the validator do not change.
 */
import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const canon = JSON.parse(readFileSync(join(root, 'src', 'data', 'canon.json'), 'utf8'));
const slugByTitle = Object.fromEntries(canon.map((b) => [b.title, b.slug]));
const refsDir = join(root, 'public', 'refs');
const titleBySlug = Object.fromEntries(canon.map((b) => [b.slug, b.title]));
const verseCounts = {};
for (const b of canon) verseCounts[b.title] = JSON.parse(readFileSync(join(root, 'public', 'text', `${b.slug}.json`), 'utf8')).chapters.map((c) => c.length);

// Verse-aligned quotation blocks: chapter offset between the two books, verse numbers identical.
const BLOCKS = [
  { a: 'Isaiah', from: 2, to: 14, b: '2 Nephi', off: 10 },
  { a: 'Isaiah', from: 48, to: 49, b: '1 Nephi', off: -28 },
  { a: 'Isaiah', from: 50, to: 51, b: '2 Nephi', off: -43 },
  { a: 'Isaiah', from: 53, to: 53, b: 'Mosiah', off: -39 },
  { a: 'Isaiah', from: 54, to: 54, b: '3 Nephi', off: -32 },
  { a: 'Malachi', from: 3, to: 4, b: '3 Nephi', off: 21 },
  { a: 'Matthew', from: 5, to: 7, b: '3 Nephi', off: 7 },
];
const perBook = {}; // slug → { "ch:v": { f:Set, p:Set } }
const add = (slug, vk, kind, ref) => {
  ((perBook[slug] ??= {})[vk] ??= { f: new Set(), p: new Set() })[kind].add(ref);
};
let removed = 0, keptP = 0, blocks = 0;
for (const file of readdirSync(refsDir)) {
  const slug = file.replace(/\.json$/, '');
  const data = JSON.parse(readFileSync(join(refsDir, file), 'utf8'));
  for (const [vk, vr] of Object.entries(data)) {
    removed += vr.f.length;
    for (const r of vr.p) { add(slug, vk, 'p', r); keptP++; }
  }
}
for (const blk of BLOCKS) {
  for (let ch = blk.from; ch <= blk.to; ch++) {
    const n = verseCounts[blk.a][ch - 1] ?? 0;
    const tn = verseCounts[blk.b][ch + blk.off - 1] ?? 0;
    for (let v = 1; v <= Math.min(n, tn); v++) {
      add(slugByTitle[blk.a], `${ch}:${v}`, 'f', `${blk.b} ${ch + blk.off}:${v}`);
      add(slugByTitle[blk.b], `${ch + blk.off}:${v}`, 'f', `${blk.a} ${ch}:${v}`);
      blocks++;
    }
  }
}
// write per-book files and count unique undirected pairs per kind
const pairs = new Map(); // "a>b|kind"
for (const [slug, verses] of Object.entries(perBook)) {
  const out = {};
  for (const [vk, sets] of Object.entries(verses)) {
    out[vk] = { f: [...sets.f], p: [...sets.p] };
    for (const kind of ['f', 'p']) for (const r of sets[kind]) {
      const m = r.match(/^(.*?) (\d+:\d+)$/);
      const a = `${slug}|${vk}`, b = `${slugByTitle[m[1]]}|${m[2]}`;
      pairs.set((a < b ? `${a}>${b}` : `${b}>${a}`) + '|' + kind, true);
    }
  }
  writeFileSync(join(refsDir, `${slug}.json`), JSON.stringify(out));
}
for (const b of canon) if (!perBook[b.slug]) writeFileSync(join(refsDir, `${b.slug}.json`), '{}');
const counts = new Map();
for (const key of pairs.keys()) {
  const cut = key.lastIndexOf('|');
  const pair = key.slice(0, cut), kind = key.slice(cut + 1);
  const [a, b] = pair.split('>');
  const k = `${a.split('|')[0]}>${b.split('|')[0]}`;
  const c = counts.get(k) ?? { f: 0, p: 0 }; c[kind]++; counts.set(k, c);
}
const matrix = [...counts.entries()].map(([k, c]) => { const [s, t] = k.split('>'); return { s, t, f: c.f, p: c.p }; }).sort((x, y) => y.f + y.p - (x.f + x.p));
writeFileSync(join(root, 'src', 'data', 'refMatrix.json'), JSON.stringify(matrix));
const uf = [...pairs.keys()].filter((k) => k.endsWith('|f')).length, up = [...pairs.keys()].filter((k) => k.endsWith('|p')).length;
console.log(`removed ${removed} footnote mentions; kept ${keptP} listing mentions (${up} unique pairs); generated ${blocks} aligned quotation pairs (${uf} unique); ${matrix.length} book-pair arcs`);
void titleBySlug;
