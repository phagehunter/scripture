/**
 * Write static, crawlable pages into dist/ after `vite build`:
 *
 *   books/<slug>/      the full text of each book, chapter by chapter, with the
 *                      figures who appear in it and its cross-reference arcs
 *   people/<id>/       every figure: disambiguator, blurb, key references and
 *                      every cited relationship
 *   chronology/        the eras and dated events of both hemispheres
 *   cross-references/  the annotated intertextual links with commentary
 *   books/, people/    index pages (books grouped by volume)
 *   sitemap.xml        every page above plus the app
 *
 * Each page links into the app with a hash the app understands
 * (#person=alma_2, #book=mosiah&chapter=14, #view=chronology).
 *
 *   node scripts/prerender.mjs
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
if (!existsSync(join(dist, 'index.html'))) throw new Error('dist/index.html not found: run vite build first');
const SITE = 'https://curtishoffmann.com/scripture/';
const data = (f) => JSON.parse(readFileSync(join(root, 'data', f), 'utf8'));
const canon = JSON.parse(readFileSync(join(root, 'src', 'data', 'canon.json'), 'utf8'));
const matrix = JSON.parse(readFileSync(join(root, 'src', 'data', 'refMatrix.json'), 'utf8'));
const people = data('people.json'), relationships = data('relationships.json'), crossrefs = data('crossrefs.json'), chronology = data('chronology.json'), eras = data('eras.json');
const text = (slug) => JSON.parse(readFileSync(join(root, 'public', 'text', `${slug}.json`), 'utf8'));
const byId = Object.fromEntries(people.map((p) => [p.id, p]));
const bySlug = Object.fromEntries(canon.map((b) => [b.slug, b]));
const byTitle = Object.fromEntries(canon.map((b) => [b.title, b]));
const VOL = { ot: 'Old Testament', nt: 'New Testament', bom: 'Book of Mormon', pgp: 'Pearl of Great Price' };
const GROUP = { deity: 'Deity and angels', prophet: 'Prophets and seers', ruler: 'Rulers and judges', disciple: 'Disciples and missionaries', adversary: 'Adversaries', kin: 'Households and kin', collective: 'Peoples and movements' };
const REL = { family: 'family', succession: 'succession', teaches: 'teaching and conversion', conflict: 'conflict', alliance: 'alliance', divine: 'divine encounter', vision: 'seen in vision', quotes: 'quotes or expounds' };
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const today = new Date().toISOString().slice(0, 10);
const fmtYear = (y) => (y < 0 ? `${Math.abs(y)} BC` : `AD ${y}`);
const urls = [];

const CSS = `
:root{--bg:#020617;--line:#1e293b;--text:#e2e8f0;--dim:#a8b3c7;--sepia:#d9c19a;--amber:#fbbf24}
*{box-sizing:border-box;margin:0;padding:0}html{-webkit-text-size-adjust:100%;scrollbar-color:#334155 transparent}
body{background:var(--bg);color:var(--text);font-family:"Source Serif 4","Iowan Old Style",Georgia,serif;line-height:1.6;font-size:17px}
::selection{background:rgba(251,191,36,.3)}a{color:var(--sepia);text-underline-offset:3px}a:hover{color:#f3ead9}
:focus-visible{outline:2px solid #7cc4ff;outline-offset:3px;border-radius:3px}
.wrap{max-width:46rem;margin:0 auto;padding:0 1.25rem}
header.site{border-bottom:1px solid var(--line);background:rgba(15,23,42,.6)}
header.site .wrap{display:flex;flex-wrap:wrap;align-items:center;gap:.5rem 1.5rem;padding-top:.9rem;padding-bottom:.9rem}
header.site .brand{font-family:"Cormorant Garamond",Georgia,serif;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--sepia);text-decoration:none;font-size:1rem}
header.site nav{display:flex;flex-wrap:wrap;gap:.25rem 1.1rem;margin-left:auto;font-family:"Source Sans 3",system-ui,sans-serif;font-size:.95rem}
header.site nav a{color:var(--dim);text-decoration:none;padding:.35rem 0;min-height:44px;display:inline-flex;align-items:center}header.site nav a:hover,header.site nav a[aria-current]{color:var(--text)}
main{padding:2.2rem 0 3rem}h1{font-family:"Cormorant Garamond",Georgia,serif;font-weight:600;font-size:clamp(1.9rem,5vw,2.7rem);line-height:1.15;color:#f8fafc;text-wrap:balance}
h2{font-family:"Cormorant Garamond",Georgia,serif;font-weight:600;font-size:1.45rem;color:var(--sepia);margin:2rem 0 .6rem;text-wrap:balance}
h3{font-family:"Cormorant Garamond",Georgia,serif;font-weight:600;font-size:1.25rem;color:var(--sepia);margin:1.6rem 0 .4rem}
.kicker{font-family:"Source Sans 3",system-ui,sans-serif;font-size:.8rem;letter-spacing:.2em;text-transform:uppercase;color:var(--dim);margin-bottom:.5rem}
.lede{color:var(--dim);font-style:italic;margin:.5rem 0 1.2rem;text-wrap:pretty}p{text-wrap:pretty;margin:0 0 1em}
.open{display:inline-flex;align-items:center;gap:.5rem;min-height:44px;padding:.5rem 1.1rem;border:1px solid rgba(251,191,36,.5);border-radius:6px;color:#fde68a;text-decoration:none;font-family:"Source Sans 3",system-ui,sans-serif;font-size:.95rem;transition:border-color .15s ease-out,transform .15s ease-out}
.open:hover{border-color:var(--amber);color:#fef3c7}.open:active{transform:scale(.96)}
.card{border:1px solid var(--line);border-radius:8px;background:rgba(15,23,42,.6);padding:1rem 1.1rem;margin:0 0 .8rem}
.card .meta{font-family:"Source Sans 3",system-ui,sans-serif;font-size:.85rem;color:var(--dim);display:flex;flex-wrap:wrap;gap:.3rem 1rem;margin-bottom:.35rem}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(14rem,1fr));gap:.5rem .9rem;list-style:none}
.grid a{display:flex;flex-direction:column;gap:.1rem;padding:.6rem .75rem;border-radius:6px;text-decoration:none;color:var(--text);min-height:44px;justify-content:center;transition:background .15s ease-out}
.grid a:hover{background:rgba(217,193,154,.08)}.grid .d{font-family:"Source Sans 3",system-ui,sans-serif;font-size:.8rem;color:var(--dim)}
.verse{font-size:1.02rem;line-height:1.75;margin-bottom:.55em}.verse .n{font-family:"Source Sans 3",system-ui,sans-serif;font-size:.72rem;color:var(--dim);vertical-align:super;margin-right:.35em;font-variant-numeric:tabular-nums}
.chapters{display:flex;flex-wrap:wrap;gap:.3rem;list-style:none;margin:0 0 1rem}.chapters a{display:inline-flex;align-items:center;justify-content:center;min-width:2.4rem;min-height:2.4rem;padding:.2rem .5rem;border:1px solid var(--line);border-radius:4px;text-decoration:none;color:var(--text);font-family:"Source Sans 3",system-ui,sans-serif;font-size:.9rem;font-variant-numeric:tabular-nums}.chapters a:hover{border-color:var(--amber)}
.pager{display:flex;justify-content:space-between;gap:1rem;margin-top:2rem;font-family:"Source Sans 3",system-ui,sans-serif}
footer.site{border-top:1px solid var(--line);padding:1.5rem 0 2.5rem;color:var(--dim);font-family:"Source Sans 3",system-ui,sans-serif;font-size:.85rem}
table{border-collapse:collapse;width:100%;font-family:"Source Sans 3",system-ui,sans-serif;font-size:.95rem}th,td{text-align:left;padding:.45rem .6rem;border-bottom:1px solid var(--line);vertical-align:top}th{color:var(--dim);font-weight:600}td.n{font-variant-numeric:tabular-nums;text-align:right;white-space:nowrap}
@media (prefers-reduced-motion:reduce){*{transition:none!important}}
`;
writeFileSync(join(dist, 'static.css'), CSS.trim() + '\n');

function page({ path, title, description, h1, kicker, lede, body, jsonld, depth, current }) {
  const up = '../'.repeat(depth);
  const url = SITE + path;
  const nav = [['books/', 'Books'], ['people/', 'People'], ['cross-references/', 'Cross-references'], ['chronology/', 'Chronology'], ['', 'Open the app']]
    .map(([p, l]) => `<a href="${up}${p}"${current === p ? ' aria-current="page"' : ''}>${l}</a>`).join('');
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${url}">
<meta name="robots" content="index, follow, max-image-preview:large">
<meta property="og:type" content="article"><meta property="og:site_name" content="Scripture Atlas"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}"><meta property="og:url" content="${url}"><meta property="og:image" content="${SITE}og-image.png"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="Scripture Atlas">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(title)}"><meta name="twitter:description" content="${esc(description)}"><meta name="twitter:image" content="${SITE}og-image.png">
<meta name="theme-color" content="#020617">
<link rel="icon" href="${up}favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="${up}static.css">
<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@graph': [jsonld, { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Curtis Hoffmann', item: 'https://curtishoffmann.com/' }, { '@type': 'ListItem', position: 2, name: 'Scripture Atlas', item: SITE }, { '@type': 'ListItem', position: 3, name: h1, item: url }] }] })}</script>
</head>
<body>
<header class="site"><div class="wrap"><a class="brand" href="${up}">Scripture Atlas</a><nav aria-label="Sections">${nav}</nav></div></header>
<main><div class="wrap">
${kicker ? `<div class="kicker">${esc(kicker)}</div>` : ''}
<h1>${esc(h1)}</h1>
${lede ? `<p class="lede">${lede}</p>` : ''}
${body}
</div></main>
<footer class="site"><div class="wrap"><p>Text: King James Bible, Book of Mormon and Pearl of Great Price from the LDS Scriptures dataset (scriptures.nephi.org, 2020-12-08 edition), which publishes it as public domain. Figures, relationships, annotated cross-references and dates by <a href="https://curtishoffmann.com/">Curtis Hoffmann</a>, CC BY 4.0; code MIT, <a href="https://github.com/phagehunter/scripture">source on GitHub</a>. Old World dates before the monarchy are traditional; Book of Mormon dates follow the text's own year counts.</p></div></footer>
</body>
</html>
`;
  mkdirSync(join(dist, path), { recursive: true });
  writeFileSync(join(dist, path, 'index.html'), html);
  urls.push(url);
}

const relCard = (r) => `<div class="card"><div class="meta"><span>${esc(REL[r.type] || r.type)}</span><span>weight ${r.weight}</span>${r.citation ? `<span>${esc(r.citation)}</span>` : ''}</div><p><a href="../../people/${r.source}/">${esc(byId[r.source]?.name)}</a> and <a href="../../people/${r.target}/">${esc(byId[r.target]?.name)}</a>. ${esc(r.summary)}</p></div>`;
const bookSlugOf = (citation) => { const m = citation.match(/^(.*?)(?:\s+\d+.*)?$/); return byTitle[m[1]]?.slug; };

// People
for (const p of people) {
  const mine = relationships.filter((r) => r.source === p.id || r.target === p.id);
  const events = chronology.filter((e) => (e.personIds ?? []).includes(p.id));
  const desc = `${p.name}, ${p.disambiguator}: ${GROUP[p.group].toLowerCase()} in the ${p.volumes.map((v) => VOL[v]).join(', ')}. ${p.blurb}`;
  page({
    path: `people/${p.id}/`, depth: 2, current: 'people/', title: `${p.name} · Scripture Atlas`, description: desc.slice(0, 300),
    kicker: `${GROUP[p.group]} · ${p.volumes.map((v) => VOL[v]).join(' · ')}`, h1: p.name, lede: esc(p.disambiguator),
    body: `<p>${esc(p.blurb)}</p>${p.collective ? `<p>A collective node standing for about ${p.collective.toLocaleString('en-US')} people.</p>` : ''}
<p>Key passages: ${p.keyRefs.map((r) => { const s = bookSlugOf(r); return s ? `<a href="../../books/${s}/">${esc(r)}</a>` : esc(r); }).join(' · ')}</p>
<p><a class="open" href="../../#person=${p.id}">Open ${esc(p.name)} in the network</a></p>
${events.length ? `<h2>On the timeline</h2>${events.map((e) => `<div class="card"><div class="meta"><span>${fmtYear(e.year)}</span>${e.citation ? `<span>${esc(e.citation)}</span>` : ''}</div><p><strong>${esc(e.label)}.</strong> ${esc(e.detail || '')}</p></div>`).join('')}` : ''}
<h2>Relationships (${mine.length})</h2>${mine.map(relCard).join('') || '<p>No recorded relationships.</p>'}`,
    jsonld: { '@type': 'Person', name: p.name, description: desc, additionalType: 'https://schema.org/CreativeWork' },
  });
}
const groupsOrder = Object.keys(GROUP);
page({ path: 'people/', depth: 1, current: 'people/', title: 'People of the Scripture Atlas', description: `${people.length} figures and collectives of the King James Bible, the Book of Mormon and the Pearl of Great Price, each with a disambiguator, key passages and every cited relationship.`, kicker: `${people.length} entries`, h1: 'People',
  body: groupsOrder.map((g) => { const ps = people.filter((p) => p.group === g); return `<h2>${GROUP[g]} (${ps.length})</h2><ul class="grid">${ps.map((p) => `<li><a href="${p.id}/"><span>${esc(p.name)}</span><span class="d">${esc(p.disambiguator)}</span></a></li>`).join('')}</ul>`; }).join(''),
  jsonld: { '@type': 'ItemList', name: 'People of the Scripture Atlas', numberOfItems: people.length } });

// Books
let totalVerses = 0;
const peopleByBook = {};
for (const p of people) for (const r of p.keyRefs) { const s = bookSlugOf(r); if (s) (peopleByBook[s] ??= new Set()).add(p.id); }
for (const r of relationships) if (r.citation) { const s = bookSlugOf(r.citation); if (s) { (peopleByBook[s] ??= new Set()).add(r.source); peopleByBook[s].add(r.target); } }
for (const b of canon) {
  const t = text(b.slug);
  const verses = t.chapters.reduce((n, c) => n + c.length, 0); totalVerses += verses;
  const arcs = matrix.filter((m) => m.s === b.slug || m.t === b.slug).sort((x, y) => y.f + y.p - (x.f + x.p)).slice(0, 12);
  const links = crossrefs.filter((c) => c.sourceBook === b.title || c.targetBook === b.title);
  const figures = [...(peopleByBook[b.slug] ?? [])].map((id) => byId[id]).filter(Boolean).sort((x, y) => x.name.localeCompare(y.name));
  const idx = canon.findIndex((x) => x.slug === b.slug);
  const prev = canon[idx - 1], next = canon[idx + 1];
  const desc = `${b.title} (${VOL[b.volume]}): ${b.chapters} chapter${b.chapters === 1 ? '' : 's'}, ${verses.toLocaleString('en-US')} verses, full text with the figures who appear and its cross-references.`;
  page({
    path: `books/${b.slug}/`, depth: 2, current: 'books/', title: `${b.title} · Scripture Atlas`, description: desc,
    kicker: `${VOL[b.volume]} · ${b.chapters} chapter${b.chapters === 1 ? '' : 's'} · ${verses.toLocaleString('en-US')} verses`, h1: b.title,
    body: `<p><a class="open" href="../../#book=${b.slug}&chapter=1">Open ${esc(b.title)} in the app</a></p>
<h2>Chapters</h2><ul class="chapters">${t.chapters.map((_, i) => `<li><a href="#c${i + 1}">${i + 1}</a></li>`).join('')}</ul>
${figures.length ? `<h2>Figures cited here</h2><p>${figures.map((p) => `<a href="../../people/${p.id}/">${esc(p.name)}</a>`).join(' · ')}</p>` : ''}
${links.length ? `<h2>Annotated cross-references</h2>${links.map((c) => `<div class="card"><div class="meta"><span>${esc(c.type)}</span><span>${esc(c.sourceRef)} → ${esc(c.targetRef)}</span></div><p>${esc(c.note)}</p></div>`).join('')}` : ''}
${arcs.length ? `<h2>Most-linked books</h2><table><thead><tr><th>Book pair</th><th class="n">Aligned quotation pairs</th><th class="n">Listing pairs</th></tr></thead><tbody>${arcs.map((m) => { const other = m.s === b.slug ? m.t : m.s; return `<tr><td><a href="../${other}/">${esc(bySlug[other]?.title)}</a>${other === b.slug ? ' (within the book)' : ''}</td><td class="n">${m.f}</td><td class="n">${m.p}</td></tr>`; }).join('')}</tbody></table>` : ''}
<h2>The text</h2>${t.chapters.map((ch, i) => `<h3 id="c${i + 1}">${esc(b.title)} ${i + 1}</h3>${ch.map((v, j) => `<p class="verse" id="v${i + 1}-${j + 1}"><span class="n">${j + 1}</span>${esc(v)}</p>`).join('')}`).join('')}
<nav class="pager" aria-label="Books">${prev ? `<a href="../${prev.slug}/">${esc(prev.title)}</a>` : '<span></span>'}${next ? `<a href="../${next.slug}/">${esc(next.title)}</a>` : '<span></span>'}</nav>`,
    jsonld: { '@type': 'Book', name: b.title, description: desc, inLanguage: 'en', numberOfPages: b.chapters, isPartOf: { '@type': 'Book', name: VOL[b.volume] }, isBasedOn: 'https://scriptures.nephi.org/' },
  });
}
page({ path: 'books/', depth: 1, current: 'books/', title: 'Books of the Scripture Atlas', description: `All ${canon.length} books of the King James Bible, the Book of Mormon and the Pearl of Great Price (${totalVerses.toLocaleString('en-US')} verses), each with its full text, figures and cross-references.`, kicker: `${canon.length} books · ${totalVerses.toLocaleString('en-US')} verses`, h1: 'Books',
  body: Object.keys(VOL).map((v) => { const bs = canon.filter((b) => b.volume === v); return `<h2>${VOL[v]} (${bs.length})</h2><ul class="grid">${bs.map((b) => `<li><a href="${b.slug}/"><span>${esc(b.title)}</span><span class="d">${b.chapters} chapter${b.chapters === 1 ? '' : 's'} · ${b.verses.toLocaleString('en-US')} verses</span></a></li>`).join('')}</ul>`; }).join(''),
  jsonld: { '@type': 'ItemList', name: 'Books of the Scripture Atlas', numberOfItems: canon.length } });

// Cross-references (annotated)
page({ path: 'cross-references/', depth: 1, current: 'cross-references/', title: 'Annotated cross-references · Scripture Atlas', description: `${crossrefs.length} annotated intertextual links between the Bible, the Book of Mormon and the Pearl of Great Price: quotations, allusions, fulfillments and typology, each with commentary.`, kicker: `${crossrefs.length} annotated links`, h1: 'Cross-references',
  lede: 'The annotated layer of the atlas: links the author chose and explained. The app also draws a wider web of verse pairs from the dataset’s reference listing and from verse-aligned quotation blocks.',
  body: ['quotation', 'allusion', 'fulfillment', 'typology'].map((t) => { const cs = crossrefs.filter((c) => c.type === t); return cs.length ? `<h2>${t[0].toUpperCase() + t.slice(1)} (${cs.length})</h2>${cs.map((c) => `<div class="card" id="${esc(c.id)}"><div class="meta"><span><a href="../books/${byTitle[c.sourceBook]?.slug}/">${esc(c.sourceRef)}</a> → <a href="../books/${byTitle[c.targetBook]?.slug}/">${esc(c.targetRef)}</a></span><span>weight ${c.weight}</span></div><p>${esc(c.note)}</p></div>`).join('')}` : ''; }).join(''),
  jsonld: { '@type': 'CreativeWork', name: 'Annotated cross-references of the Scripture Atlas', author: { '@type': 'Person', name: 'Curtis Hoffmann' } } });

// Chronology
page({ path: 'chronology/', depth: 1, current: 'chronology/', title: 'Parallel chronology · Scripture Atlas', description: `${eras.length} eras and ${chronology.length} dated events of the Bible and the Book of Mormon on one timeline, from the patriarchs and the Jaredites to the Restoration.`, kicker: `${eras.length} eras · ${chronology.length} events`, h1: 'Parallel chronology',
  lede: 'Old World above, New World below. Dates before the monarchy are traditional; Book of Mormon dates follow the text’s own year counts.',
  body: `<p><a class="open" href="../#view=chronology">Open the timeline in the app</a></p>
<h2>Eras</h2><table><thead><tr><th>Era</th><th>Track</th><th class="n">From</th><th class="n">To</th></tr></thead><tbody>${eras.map((e) => `<tr><td><strong>${esc(e.label)}</strong><br>${esc(e.blurb)}</td><td>${e.track === 'oldworld' ? 'Old World' : 'New World'}</td><td class="n">${fmtYear(e.start)}</td><td class="n">${fmtYear(e.end)}</td></tr>`).join('')}</tbody></table>
<h2>Events</h2>${['oldworld', 'newworld'].map((tr) => `<h3>${tr === 'oldworld' ? 'Old World' : 'New World'}</h3>${chronology.filter((e) => e.track === tr).sort((a, b) => a.year - b.year).map((e) => `<div class="card"><div class="meta"><span>${fmtYear(e.year)}</span>${e.citation ? `<span>${esc(e.citation)}</span>` : ''}${(e.personIds ?? []).map((id) => byId[id] ? `<a href="../people/${id}/">${esc(byId[id].name)}</a>` : '').join('')}</div><p><strong>${esc(e.label)}.</strong> ${esc(e.detail || '')}</p></div>`).join('')}`).join('')}`,
  jsonld: { '@type': 'Dataset', name: 'Parallel chronology of the Bible and the Book of Mormon', description: 'Eras and dated events on one timeline; dates before the monarchy are traditional.', creator: { '@type': 'Person', name: 'Curtis Hoffmann' } } });

const sm = [SITE, ...urls].map((u) => `  <url><loc>${u}</loc><lastmod>${today}</lastmod></url>`).join('\n');
writeFileSync(join(dist, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sm}\n</urlset>\n`);
console.log(`prerendered ${urls.length} pages (${people.length} people, ${canon.length} books, chronology, cross-references, 2 indexes) and a ${urls.length + 1}-URL sitemap`);
