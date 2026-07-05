/**
 * Comprehensive cross-reference extraction (dev-time only).
 *
 * Sources (in ../lds-scriptures-2020.12.08/references/):
 *  1. KJV_Order.pdf — "Bible / Book of Mormon Cross References": verse-pair
 *     listing (Bible ref → BoM ref), two columns × 104 pages.
 *  2. triple_combination_english.pdf — official footnotes: per-verse scripture
 *     references at each page's foot. We keep OT/NT/BoM targets and skip
 *     Topical Guide / Bible Dictionary / JST / D&C / Pearl of Great Price
 *     entries (outside this atlas's canon).
 *
 * Outputs:
 *  - src/data/refMatrix.json    aggregate book→book counts (arc diagram)
 *  - public/refs/<slug>.json    per-book, per-verse reference lists (reader)
 *
 * Usage: node scripts/extract-refs.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const refDir = join(root, '..', 'lds-scriptures-2020.12.08', 'references');
const canon = JSON.parse(readFileSync(join(root, 'src', 'data', 'canon.json'), 'utf8'));
const TITLE_SET = new Set(canon.map((b) => b.title));
const SLUG_BY_TITLE = Object.fromEntries(canon.map((b) => [b.title, b.slug]));

// Verse counts per chapter from the actual text — every extracted pair is
// validated against the canon; refs to non-existent verses are dropped.
const verseCounts = {};
for (const b of canon) {
  const t = JSON.parse(readFileSync(join(root, 'public', 'text', `${b.slug}.json`), 'utf8'));
  verseCounts[b.title] = t.chapters.map((c) => c.length);
}
const verseExists = (title, ch, v) => {
  const vc = verseCounts[title];
  return !!vc && ch >= 1 && ch <= vc.length && v >= 1 && v <= vc[ch - 1];
};
let dropped = 0;
let agreements = 0; // pairs independently attested by BOTH sources

/** Full-name fixups for the KJV_Order listing. */
const NAME_FIX = {
  Psalm: 'Psalms',
  'Song of Songs': 'Song of Solomon',
  Revelations: 'Revelation',
};

/** Footnote abbreviation → canon title (OT/NT/BoM only). */
const ABBR = {
  'Gen.': 'Genesis', 'Ex.': 'Exodus', 'Lev.': 'Leviticus', 'Num.': 'Numbers', 'Deut.': 'Deuteronomy',
  'Josh.': 'Joshua', 'Judg.': 'Judges', 'Ruth': 'Ruth', '1 Sam.': '1 Samuel', '2 Sam.': '2 Samuel',
  '1 Kgs.': '1 Kings', '2 Kgs.': '2 Kings', '1 Chr.': '1 Chronicles', '2 Chr.': '2 Chronicles',
  'Ezra': 'Ezra', 'Neh.': 'Nehemiah', 'Esth.': 'Esther', 'Job': 'Job', 'Ps.': 'Psalms',
  'Prov.': 'Proverbs', 'Eccl.': 'Ecclesiastes', 'Song': 'Song of Solomon', 'Isa.': 'Isaiah',
  'Jer.': 'Jeremiah', 'Lam.': 'Lamentations', 'Ezek.': 'Ezekiel', 'Dan.': 'Daniel', 'Hosea': 'Hosea',
  'Joel': 'Joel', 'Amos': 'Amos', 'Obad.': 'Obadiah', 'Jonah': 'Jonah', 'Micah': 'Micah',
  'Nahum': 'Nahum', 'Hab.': 'Habakkuk', 'Zeph.': 'Zephaniah', 'Hag.': 'Haggai', 'Zech.': 'Zechariah',
  'Mal.': 'Malachi',
  'Matt.': 'Matthew', 'Mark': 'Mark', 'Luke': 'Luke', 'John': 'John', 'Acts': 'Acts',
  'Rom.': 'Romans', '1 Cor.': '1 Corinthians', '2 Cor.': '2 Corinthians', 'Gal.': 'Galatians',
  'Eph.': 'Ephesians', 'Philip.': 'Philippians', 'Col.': 'Colossians', '1 Thes.': '1 Thessalonians',
  '2 Thes.': '2 Thessalonians', '1 Tim.': '1 Timothy', '2 Tim.': '2 Timothy', 'Titus': 'Titus',
  'Philem.': 'Philemon', 'Heb.': 'Hebrews', 'James': 'James', '1 Pet.': '1 Peter', '2 Pet.': '2 Peter',
  '1 Jn.': '1 John', '2 Jn.': '2 John', '3 Jn.': '3 John', 'Jude': 'Jude', 'Rev.': 'Revelation',
  '1 Ne.': '1 Nephi', '2 Ne.': '2 Nephi', 'Jacob': 'Jacob', 'Enos': 'Enos', 'Jarom': 'Jarom',
  'Omni': 'Omni', 'W of M': 'Words of Mormon', 'Mosiah': 'Mosiah', 'Alma': 'Alma', 'Hel.': 'Helaman',
  '3 Ne.': '3 Nephi', '4 Ne.': '4 Nephi', 'Morm.': 'Mormon', 'Ether': 'Ether', 'Moro.': 'Moroni',
};

/** BoM book detection in page headers (de-spaced smallcaps). */
const HEADER_BOOKS = {
  '1NEPHI': '1 Nephi', '2NEPHI': '2 Nephi', 'JACOB': 'Jacob', 'ENOS': 'Enos', 'JAROM': 'Jarom',
  'OMNI': 'Omni', 'WORDSOFMORMON': 'Words of Mormon', 'MOSIAH': 'Mosiah', 'ALMA': 'Alma',
  'HELAMAN': 'Helaman', '3NEPHI': '3 Nephi', '4NEPHI': '4 Nephi', 'MORMON': 'Mormon',
  'ETHER': 'Ether', 'MORONI': 'Moroni',
};

// ————— collected pairs, tagged by source —————
// src 'f' = official footnotes (editorially curated)
// src 'p' = KJV_Order phrase-matching concordance (mechanical, generous)
const pairs = [];
const seen = new Map(); // key → pair (footnote source wins on duplicates)
function addPair(fb, fc, fv, tb, tc, tv, src) {
  if (!TITLE_SET.has(fb) || !TITLE_SET.has(tb)) return;
  if (fb === tb && fc === tc && fv === tv) return;
  // internal validity: both endpoints must exist in the canon text
  if (!verseExists(fb, fc, fv) || !verseExists(tb, tc, tv)) {
    dropped++;
    return;
  }
  const key = `${fb}|${fc}|${fv}>${tb}|${tc}|${tv}`;
  const rkey = `${tb}|${tc}|${tv}>${fb}|${fc}|${fv}`;
  const existing = seen.get(key) ?? seen.get(rkey);
  if (existing) {
    if (existing.src !== src) agreements++; // independent attestation
    if (src === 'f') existing.src = 'f'; // upgrade to curated
    return;
  }
  const pair = { fb, fc, fv, tb, tc, tv, src };
  seen.set(key, pair);
  pairs.push(pair);
}

// ═══════════ 1. KJV_Order.pdf ═══════════
async function parseKjvOrder() {
  const doc = await getDocument({ url: join(refDir, 'KJV_Order.pdf'), useSystemFonts: true }).promise;
  const BOOK_RE = String.raw`((?:[1-4] )?[A-Z][a-z]+(?: (?:of )?[A-Z][a-z]+)*)`;
  const pairRe = new RegExp(`${BOOK_RE} (\\d+):(\\d+)\\s+${BOOK_RE} (\\d+):(\\d+)`, 'g');
  let count = 0;
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    // split into two physical columns, then read each top-down
    const mid = page.view[2] / 2;
    const cols = [[], []];
    for (const it of content.items) {
      if (!it.str.trim()) continue;
      cols[it.transform[4] < mid ? 0 : 1].push(it);
    }
    for (const col of cols) {
      col.sort((a, b) => b.transform[5] - a.transform[5] || a.transform[4] - b.transform[4]);
      const text = col
        .map((i) => i.str)
        .join(' ')
        .replace(/www\.\S+|Page \d+|Bible \/ Book Of Mormon Cross References/g, ' ');
      let m;
      while ((m = pairRe.exec(text))) {
        const fb = NAME_FIX[m[1]] ?? m[1];
        const tb = NAME_FIX[m[4]] ?? m[4];
        const fSlugOk = TITLE_SET.has(fb);
        const tOk = TITLE_SET.has(tb);
        if (fSlugOk && tOk) {
          addPair(fb, +m[2], +m[3], tb, +m[5], +m[6], 'p');
          count++;
        }
      }
    }
  }
  console.log(`KJV_Order: ${count} pair-mentions parsed`);
}

// ═══════════ 2. triple_combination_english.pdf footnotes ═══════════
async function parseTriple() {
  const doc = await getDocument({ url: join(refDir, 'triple_combination_english.pdf'), useSystemFonts: true }).promise;
  const abbrAlt = Object.keys(ABBR)
    .sort((a, b) => b.length - a.length)
    .map((a) => a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|');
  const refRe = new RegExp(`(${abbrAlt})\\s*(\\d+):(\\d+)`, 'g');
  const bareRe = /^\s*(\d+):(\d+)/;
  let kept = 0;
  let pagesUsed = 0;

  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    const items = content.items.filter((i) => i.str.trim());
    if (!items.length) continue;

    // — header: topmost line → current book/chapter/verse-range —
    const topY = Math.max(...items.map((i) => i.transform[5]));
    const headerText = items
      .filter((i) => i.transform[5] > topY - 4)
      .sort((a, b) => a.transform[4] - b.transform[4])
      .map((i) => i.str)
      .join('')
      .replace(/\s+/g, '')
      .toUpperCase();
    const hm = headerText.match(
      /(1NEPHI|2NEPHI|JACOB|ENOS|JAROM|OMNI|WORDSOFMORMON|MOSIAH|ALMA|HELAMAN|3NEPHI|4NEPHI|MORMON|ETHER|MORONI)(\d+)(?::(\d+))?(?:[–-](?:(\d+):)?(\d+))?/,
    );
    if (!hm) continue;
    const srcBook = HEADER_BOOKS[hm[1]];
    const c1 = +hm[2];
    const v1 = hm[3] ? +hm[3] : 1;
    const c2 = hm[4] ? +hm[4] : null; // page spans a chapter boundary
    const v2 = hm[5] ? +hm[5] : null;

    // — footnote block: contiguous small-font region at page bottom —
    const heights = items.map((i) => i.height).sort((a, b) => a - b);
    const median = heights[Math.floor(heights.length / 2)];
    const small = items.filter((i) => i.height > 0 && i.height < median - 0.4);
    if (small.length < 6) continue;
    // group small items into lines; take the bottom-most contiguous band
    const smallYs = [...new Set(small.map((i) => Math.round(i.transform[5])))].sort((a, b) => a - b);
    let bandTop = smallYs[0];
    for (let k = 1; k < smallYs.length; k++) {
      if (smallYs[k] - smallYs[k - 1] > 14) break; // gap → body superscripts above
      bandTop = smallYs[k];
    }
    const foot = small.filter((i) => i.transform[5] <= bandTop + 1);
    if (foot.length < 6) continue;

    // — three footnote columns by x —
    const w = page.view[2];
    const colsX = [w * 0.37, w * 0.66];
    const cols = [[], [], []];
    for (const it of foot) {
      const x = it.transform[4];
      cols[x < colsX[0] ? 0 : x < colsX[1] ? 1 : 2].push(it);
    }

    let verse = v1; // current source verse as we walk the footnote stream
    for (const col of cols) {
      col.sort((a, b) => b.transform[5] - a.transform[5] || a.transform[4] - b.transform[4]);
      const stream = col.map((i) => i.str).join(' ');
      // segments split on ; and . — walk with a lastBook memory
      let lastBook = null;
      for (const seg of stream.split(/[;]/)) {
        // verse marker(s) inside segment: "7 a" → verse 7
        const vm = seg.match(/(?:^|\s)(\d{1,3})\s+[a-h](?:\s|$)/);
        if (vm) verse = +vm[1];
        refRe.lastIndex = 0;
        let matched = false;
        let m;
        while ((m = refRe.exec(seg))) {
          matched = true;
          lastBook = ABBR[m[1]];
          const ch = c2 !== null && verse <= (v2 ?? 0) ? c2 : c1;
          addPair(srcBook, ch, verse, lastBook, +m[2], +m[3], 'f');
          kept++;
        }
        if (!matched && lastBook) {
          const bm = seg.match(bareRe);
          if (bm) {
            const ch = c2 !== null && verse <= (v2 ?? 0) ? c2 : c1;
            addPair(srcBook, ch, verse, lastBook, +bm[1], +bm[2], 'f');
            kept++;
          }
        }
      }
    }
    pagesUsed++;
    if (p % 150 === 0) console.log(`  …page ${p}/${doc.numPages} (${kept} refs so far)`);
  }
  console.log(`Triple footnotes: ${kept} refs from ${pagesUsed} Book of Mormon pages`);
}

/**
 * 3. Verse-aligned quotation blocks — the study edition's chapter headings
 * mark these as direct quotations ("compare Isaiah 2"), and their verse
 * numbering aligns 1:1, so the pairs are generated systematically (and still
 * pass the existence guard on both sides). Recorded as curated ('f').
 */
function addQuotationBlocks() {
  const BLOCKS = [
    { a: 'Isaiah', from: 2, to: 14, b: '2 Nephi', off: 10 },
    { a: 'Isaiah', from: 48, to: 49, b: '1 Nephi', off: -28 },
    { a: 'Isaiah', from: 50, to: 51, b: '2 Nephi', off: -43 },
    { a: 'Isaiah', from: 53, to: 53, b: 'Mosiah', off: -39 },
    { a: 'Isaiah', from: 54, to: 54, b: '3 Nephi', off: -32 },
    { a: 'Malachi', from: 3, to: 4, b: '3 Nephi', off: 21 },
    { a: 'Matthew', from: 5, to: 7, b: '3 Nephi', off: 7 },
  ];
  let n = 0;
  for (const blk of BLOCKS) {
    for (let ch = blk.from; ch <= blk.to; ch++) {
      const vc = verseCounts[blk.a][ch - 1] ?? 0;
      for (let v = 1; v <= vc; v++) {
        addPair(blk.a, ch, v, blk.b, ch + blk.off, v, 'f');
        n++;
      }
    }
  }
  console.log(`Quotation blocks: ${n} verse-aligned pairs generated`);
}

await parseKjvOrder();
await parseTriple();
addQuotationBlocks();
console.log(`TOTAL unique verse-pairs: ${pairs.length} · dropped (failed existence check): ${dropped} · inter-source agreements: ${agreements}`);

// ═══════════ outputs ═══════════
// (a) aggregate book→book matrix with per-source counts
const matrix = new Map(); // key → {f, p}
for (const pr of pairs) {
  const key = `${SLUG_BY_TITLE[pr.fb]}>${SLUG_BY_TITLE[pr.tb]}`;
  if (!matrix.has(key)) matrix.set(key, { f: 0, p: 0 });
  matrix.get(key)[pr.src]++;
}
const matrixOut = [...matrix.entries()]
  .map(([k, c]) => {
    const [s, t] = k.split('>');
    return { s, t, f: c.f, p: c.p };
  })
  .sort((a, b) => b.f + b.p - (a.f + a.p));
writeFileSync(join(root, 'src', 'data', 'refMatrix.json'), JSON.stringify(matrixOut));
const stats = pairs.reduce((a, pr) => ((a[pr.src] = (a[pr.src] ?? 0) + 1), a), {});
console.log(`refMatrix.json: ${matrixOut.length} book-pairs · curated(f)=${stats.f} phrase(p)=${stats.p}`);

// (b) per-book, per-verse reference lists (both directions), split by source
const perBook = new Map(); // slug → { "ch:v": {f:Set, p:Set} }
function addToBook(book, ch, v, refStr, src) {
  const slug = SLUG_BY_TITLE[book];
  if (!perBook.has(slug)) perBook.set(slug, {});
  const o = perBook.get(slug);
  const key = `${ch}:${v}`;
  if (!o[key]) o[key] = { f: new Set(), p: new Set() };
  o[key][src].add(refStr);
}
for (const pr of pairs) {
  addToBook(pr.fb, pr.fc, pr.fv, `${pr.tb} ${pr.tc}:${pr.tv}`, pr.src);
  addToBook(pr.tb, pr.tc, pr.tv, `${pr.fb} ${pr.fc}:${pr.fv}`, pr.src);
}
mkdirSync(join(root, 'public', 'refs'), { recursive: true });
let files = 0;
for (const [slug, o] of perBook) {
  const out = Object.fromEntries(
    Object.entries(o).map(([k, s]) => [k, { f: [...s.f], p: [...s.p] }]),
  );
  writeFileSync(join(root, 'public', 'refs', `${slug}.json`), JSON.stringify(out));
  files++;
}
console.log(`public/refs/: ${files} book files`);
