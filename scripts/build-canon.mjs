/**
 * Preprocess the LDS scriptures dataset (lds-scriptures-2020.12.08, JSON export)
 * into per-book text files consumed by the in-app reader, plus a canon index.
 *
 * Scope: King James Old & New Testaments + the Book of Mormon (volumes 1–3).
 *
 * Usage:  node scripts/build-canon.mjs [path-to-lds-scriptures-json.txt]
 * Output: public/text/<book-slug>.json   — { volume, title, slug, chapters: [[verse, …], …] }
 *         src/data/canon.json            — ordered book index with chapter/verse counts
 */
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const source =
  process.argv[2] ??
  join(root, '..', 'lds-scriptures-2020.12.08', 'json', 'lds-scriptures-json.txt');

const VOLUME_KEY = {
  'Old Testament': 'ot',
  'New Testament': 'nt',
  'Book of Mormon': 'bom',
  'Pearl of Great Price': 'pgp',
};

const slugify = (title) =>
  title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');

console.log('Reading', source, '…');
const verses = JSON.parse(readFileSync(source, 'utf8'));

/** slug → { volume, title, slug, chapters: [[text,…],…] }, in canonical order */
const books = new Map();

for (const v of verses) {
  const volume = VOLUME_KEY[v.volume_title];
  if (!volume) continue; // skip Doctrine & Covenants
  const slug = slugify(v.book_title);
  if (!books.has(slug)) {
    books.set(slug, { volume, title: v.book_title, slug, chapters: [] });
  }
  const book = books.get(slug);
  const ch = v.chapter_number - 1;
  (book.chapters[ch] ??= [])[v.verse_number - 1] = v.scripture_text;
}

mkdirSync(join(root, 'public', 'text'), { recursive: true });
const index = [];
let order = 0;
let totalVerses = 0;

for (const book of books.values()) {
  writeFileSync(join(root, 'public', 'text', `${book.slug}.json`), JSON.stringify(book));
  const verseCount = book.chapters.reduce((s, c) => s + c.length, 0);
  totalVerses += verseCount;
  index.push({
    slug: book.slug,
    title: book.title,
    volume: book.volume,
    chapters: book.chapters.length,
    verses: verseCount,
    order: order++,
  });
}

mkdirSync(join(root, 'src', 'data'), { recursive: true });
writeFileSync(join(root, 'src', 'data', 'canon.json'), JSON.stringify(index, null, 1));

console.log(`${index.length} books, ${totalVerses} verses.`);
for (const vol of ['ot', 'nt', 'bom']) {
  const n = index.filter((b) => b.volume === vol).length;
  console.log(`  ${vol}: ${n} books`);
}
