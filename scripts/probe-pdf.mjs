// Probe: dump raw text of selected pages from a PDF to understand structure.
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

const [, , file, ...pageArgs] = process.argv;
const pages = pageArgs.map(Number);

const doc = await getDocument({ url: file, useSystemFonts: true }).promise;
console.log(`== ${file}: ${doc.numPages} pages ==`);
for (const p of pages) {
  if (p > doc.numPages) continue;
  const page = await doc.getPage(p);
  const content = await page.getTextContent();
  // Reconstruct lines by y-position
  const items = content.items.map((it) => ({
    str: it.str,
    x: it.transform[4],
    y: it.transform[5],
  }));
  const lines = new Map();
  for (const it of items) {
    const key = Math.round(it.y / 2) * 2;
    if (!lines.has(key)) lines.set(key, []);
    lines.get(key).push(it);
  }
  const sorted = [...lines.entries()].sort((a, b) => b[0] - a[0]);
  console.log(`\n---- page ${p} ----`);
  for (const [, lineItems] of sorted.slice(0, 60)) {
    lineItems.sort((a, b) => a.x - b.x);
    console.log(lineItems.map((i) => i.str).join(' ').slice(0, 200));
  }
}
