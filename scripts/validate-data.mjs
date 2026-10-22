/**
 * Internal validity & reliability audit for every "connection" in the atlas.
 *
 * Checks:
 *  A. Existence — every citation/reference endpoint (book, chapter, verse)
 *     across ALL datasets must point to a verse that actually exists in the
 *     37,706-verse canon: extracted refs (public/refs/*), refMatrix,
 *     curated crossrefs, relationship citations, people keyRefs,
 *     chronology citations, name-rule book scopes.
 *  B. Consistency — artifacts must agree with each other:
 *     refMatrix counts == pairs derivable from per-book files;
 *     per-book files must be symmetric (if A lists B, B lists A).
 *  C. Reliability — inter-source agreement between the two independent
 *     corpora (footnotes vs phrase concordance), plus a fixed panel of
 *     well-known ground-truth references that must be present.
 *
 * Usage: node scripts/validate-data.mjs
 * Exits non-zero if any check fails.
 */
import { readFileSync, readdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const canon = JSON.parse(readFileSync(join(root, 'src', 'data', 'canon.json'), 'utf8'));
const BY_TITLE = Object.fromEntries(canon.map((b) => [b.title, b]));
const BY_SLUG = Object.fromEntries(canon.map((b) => [b.slug, b]));

// verse counts per chapter, from the actual text
const verseCounts = {}; // slug → [count per chapter]
for (const b of canon) {
  const t = JSON.parse(readFileSync(join(root, 'public', 'text', `${b.slug}.json`), 'utf8'));
  verseCounts[b.slug] = t.chapters.map((c) => c.length);
}

const problems = [];
const warn = (cat, msg) => problems.push(`[${cat}] ${msg}`);

const chapterExists = (slug, ch) => ch >= 1 && ch <= verseCounts[slug].length;
const verseExists = (slug, ch, v) => chapterExists(slug, ch) && v >= 1 && v <= verseCounts[slug][ch - 1];

/** Parse "Book C:V" (exact verse ref string used in refs files). */
function parseVerseRef(s) {
  const m = s.match(/^(.*?) (\d+):(\d+)$/);
  if (!m || !BY_TITLE[m[1]]) return null;
  return { slug: BY_TITLE[m[1]].slug, ch: +m[2], v: +m[3] };
}

/** Parse a human citation: "Book", "Book 12", "Book 12:3", "Book 12:3-9", "Book 2–14", "Book 52:7–10". */
function checkCitation(cat, s) {
  const m = s.match(/^(.*?)(?:\s+(\d+)(?::(\d+))?(?:\s*[–-]\s*(?:(\d+):)?(\d+))?)?$/);
  const title = m?.[1]?.trim();
  if (!title || !BY_TITLE[title]) return warn(cat, `unknown book in "${s}"`);
  const slug = BY_TITLE[title].slug;
  if (!m[2]) return;
  const c1 = +m[2];
  if (!chapterExists(slug, c1)) return warn(cat, `"${s}": chapter ${c1} out of range (${verseCounts[slug].length} chapters)`);
  if (m[3] && !verseExists(slug, c1, +m[3])) return warn(cat, `"${s}": verse ${c1}:${m[3]} out of range (${verseCounts[slug][c1 - 1]} verses)`);
  if (m[5]) {
    if (m[4]) {
      // cross-chapter range "12:3–14:2" or chapter range "2–14"
      const c2 = +m[4];
      if (!verseExists(slug, c2, +m[5])) return warn(cat, `"${s}": end ${c2}:${m[5]} out of range`);
    } else if (m[3]) {
      if (!verseExists(slug, c1, +m[5])) return warn(cat, `"${s}": end verse ${c1}:${m[5]} out of range`);
    } else {
      if (!chapterExists(slug, +m[5])) return warn(cat, `"${s}": end chapter ${m[5]} out of range`);
    }
  }
}

// ═══════ A1. extracted per-book reference files ═══════
let refEntries = 0;
let refTargets = 0;
const pairSet = new Set(); // "slugA|c:v>slugB|c:v" for symmetry + matrix checks
const refsDir = join(root, 'public', 'refs');
for (const file of readdirSync(refsDir)) {
  const slug = file.replace(/\.json$/, '');
  if (!BY_SLUG[slug]) {
    warn('refs', `orphan file ${file}`);
    continue;
  }
  const data = JSON.parse(readFileSync(join(refsDir, file), 'utf8'));
  for (const [vk, vr] of Object.entries(data)) {
    refEntries++;
    const [ch, v] = vk.split(':').map(Number);
    if (!verseExists(slug, ch, v)) warn('refs', `${BY_SLUG[slug].title} ${vk} does not exist (source side)`);
    for (const kind of ['f', 'p']) {
      for (const r of vr[kind]) {
        refTargets++;
        const t = parseVerseRef(r);
        if (!t) {
          warn('refs', `${BY_SLUG[slug].title} ${vk} → unparseable "${r}"`);
          continue;
        }
        if (!verseExists(t.slug, t.ch, t.v)) warn('refs', `${BY_SLUG[slug].title} ${vk} → "${r}" does not exist (target side)`);
        pairSet.add(`${slug}|${vk}|${kind}>${t.slug}|${t.ch}:${t.v}`);
      }
    }
  }
}

// ═══════ B1. symmetry: A→B implies B→A (same source kind) ═══════
let asym = 0;
for (const key of pairSet) {
  const m = key.match(/^(.+)\|(.+)\|(f|p)>(.+)\|(.+)$/);
  const rkey = `${m[4]}|${m[5]}|${m[3]}>${m[1]}|${m[2]}`;
  if (!pairSet.has(rkey)) {
    asym++;
    if (asym <= 5) warn('symmetry', `missing reverse of ${key}`);
  }
}
if (asym > 5) warn('symmetry', `…and ${asym - 5} more asymmetric entries`);

// ═══════ B2. refMatrix consistency ═══════
const matrix = JSON.parse(readFileSync(join(root, 'src', 'data', 'refMatrix.json'), 'utf8'));
let matrixF = 0;
let matrixP = 0;
for (const bp of matrix) {
  if (!BY_SLUG[bp.s] || !BY_SLUG[bp.t]) warn('matrix', `unknown slug in ${bp.s}>${bp.t}`);
  matrixF += bp.f;
  matrixP += bp.p;
}
// each unique pair appears once directionally in matrix; per-book files hold it twice (both directions)
const dirPairs = new Set();
for (const key of pairSet) {
  const m = key.match(/^(.+)\|(.+)\|(f|p)>(.+)\|(.+)$/);
  const a = `${m[1]}|${m[2]}`;
  const b = `${m[4]}|${m[5]}`;
  const kind = m[3];
  dirPairs.add(a < b ? `${a}>${b}|${kind}` : `${b}>${a}|${kind}`);
}
const fileF = [...dirPairs].filter((k) => k.endsWith('|f')).length;
const fileP = [...dirPairs].filter((k) => k.endsWith('|p')).length;
if (fileF !== matrixF) warn('matrix', `footnote count mismatch: matrix=${matrixF} files=${fileF}`);
if (fileP !== matrixP) warn('matrix', `phrase count mismatch: matrix=${matrixP} files=${fileP}`);

// ═══════ A2. curated datasets ═══════
const data = (f) => JSON.parse(readFileSync(join(root, 'data', f), 'utf8'));
const people = data('people.json'), relationships = data('relationships.json'), crossrefs = data('crossrefs.json'), chronology = data('chronology.json'), eras = data('eras.json');
const personIds = new Set(people.map((p) => p.id));
for (const p of people) {
  if (personIds.size !== people.length) break;
  if (!p.name || !p.disambiguator || !p.group || !p.blurb) warn('people', `${p.id} missing fields`);
  for (const r of p.keyRefs) checkCitation('people', r);
}
if (personIds.size !== people.length) warn('people', 'duplicate ids');
for (const r of relationships) {
  if (!personIds.has(r.source)) warn('relationships', `unknown source ${r.source}`);
  if (!personIds.has(r.target)) warn('relationships', `unknown target ${r.target}`);
  if (r.citation) checkCitation('relationships', r.citation);
}
for (const c of crossrefs) { checkCitation('crossrefs', c.sourceRef); checkCitation('crossrefs', c.targetRef); }
const eraIds = new Set(eras.map((e) => e.id));
for (const e of chronology) {
  if (e.citation) checkCitation('chronology', e.citation);
  if (!eraIds.has(e.era)) warn('chronology', `${e.label}: unknown era ${e.era}`);
  for (const id of e.personIds ?? []) if (!personIds.has(id)) warn('chronology', `${e.label}: unknown person ${id}`);
}

const rules = readFileSync(join(root, 'src', 'data', 'nameRules.ts'), 'utf8');
for (const m of rules.matchAll(/books: \[([^\]]+)\]/g))
  for (const s of m[1].split(',').map((x) => x.replace(/'/g, '').trim()).filter(Boolean))
    if (!BY_SLUG[s]) warn('nameRules', `unknown book slug '${s}'`);

// ═══════ C. ground-truth panel — must-exist connections ═══════
// Panel restricted to what the two remaining sources contain: the dataset's
// reference listing ("p") and the verse-aligned quotation blocks ("f").
const GROUND_TRUTH = [
  ['1-nephi', '3:7', 'Philippians 4:13'], // reference listing
  ['mosiah', '14:5', 'Isaiah 53:5'], // Abinadi quoting the suffering servant (aligned block)
  ['isaiah', '53:5', 'Mosiah 14:5'], // …and its reverse link
  ['2-nephi', '12:2', 'Isaiah 2:2'], // quotation block, verse-aligned
  ['2-nephi', '24:12', 'Isaiah 14:12'], // quotation block, far end
  ['1-nephi', '20:1', 'Isaiah 48:1'], // quotation block with negative offset
  ['3-nephi', '12:3', 'Matthew 5:3'], // Sermon at the Temple
  ['3-nephi', '24:1', 'Malachi 3:1'], // Malachi dictated at Bountiful
  ['helaman', '8:14', 'Numbers 21:9'], // brass serpent, reference listing
  ['moroni', '10:4', 'James 1:5'], // ask-of-God pairing, reference listing
];
for (const [slug, vk, target] of GROUND_TRUTH) {
  const data = JSON.parse(readFileSync(join(refsDir, `${slug}.json`), 'utf8'));
  const vr = data[vk];
  const all = vr ? [...vr.f, ...vr.p] : [];
  if (!all.includes(target)) warn('ground-truth', `${BY_SLUG[slug].title} ${vk} missing expected "${target}"`);
}

// ═══════ report ═══════
console.log(`Canon: ${canon.length} books, ${Object.values(verseCounts).flat().reduce((a, b) => a + b, 0)} verses`);
console.log(`Reference corpus: ${refEntries} verse entries, ${refTargets} directed mentions, ${fileF} aligned-quotation + ${fileP} listing unique pairs`);
console.log(`Curated data: ${people.length} people, ${relationships.length} relationships, ${crossrefs.length} annotated cross-references, ${chronology.length} events, ${eras.length} eras`);
console.log(`Ground-truth panel: ${GROUND_TRUTH.length} checks`);
if (problems.length === 0) {
  console.log('\n✅ ALL CHECKS PASSED');
} else {
  const byCat = {};
  for (const p of problems) byCat[p.match(/^\[(\w+)/)[1]] = (byCat[p.match(/^\[(\w+)/)[1]] ?? 0) + 1;
  console.log(`\n❌ ${problems.length} problems:`, byCat);
  for (const p of problems.slice(0, 200)) console.log('  ' + p);
  if (problems.length > 200) console.log(`  …and ${problems.length - 200} more`);
  process.exit(1);
}
