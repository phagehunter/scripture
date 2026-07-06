# Scripture Atlas

A single-page digital-humanities dashboard for the visual literary analysis of the **King James Bible**, the **Book of Mormon**, and the **Pearl of Great Price** — combining distant reading (network, intertext, and chronology visualizations) with close reading (commentary, careful character disambiguation, and the complete 38,341-verse text readable alongside every view).

## Three analytical dimensions

| View | What it shows |
|---|---|
| **Character Network** | 192 curated figures and collectives across four volumes, force-directed. Node size ∝ degree centrality; color = role group; eight typed edge classes (family, succession, teaching, conflict, alliance, divine encounter, vision, quotation). Homonyms carry standard subscript numbering — Alma₁/Alma₂, Nephi₁–₃, Moroni₁/₂ — so the four Nephis can never be confused. Cross-volume edges are the connective tissue: Nephi₁ sees Mary in vision, Abinadi expounds Isaiah, the risen Christ dictates Malachi, and Moroni₂ — the record's last historian — returns as the messenger of Joseph Smith's history. |
| **Cross-References** | Two layers. *Complete web*: **14,076 validated verse-pairs** — official study-edition footnotes (7,543 curated references, including the Pearl of Great Price apparatus) plus a phrase-matching concordance (6,533 mechanical parallels, clearly labelled) — aggregated into 1,171 book-to-book arcs with source and threshold controls; click any arc to browse its verse pairs, or open any pair side by side in the Compare tab. *Annotated highlights*: 63 links with editorial commentary, from the thirteen-chapter Isaiah quotation in 2 Nephi to Genesis ↔ Moses and Matthew 24 ↔ Joseph Smith—Matthew. Cross-references also appear **verse by verse in the reader** as clickable chips. |
| **Parallel Chronology** | Old World and New World on one piecewise, zoomable time axis — Jaredites parallel to the patriarchs, Lehi departing during Jeremiah's ministry, the AD 33 darkness marked simultaneously in both hemispheres, and the timeline extending to the Restoration era of the Pearl of Great Price. |

## Interactive apparatus

- **Global filters**: volume chips (OT / NT / BoM), a dual-thumb window over **twelve eras** (Primeval → Nephite Twilight), and seven role-group toggles — all views respond live.
- **Era playback**: watch the network assemble era by era (growing or isolated modes).
- **Character search** with disambiguators shown, plus **focus mode** (any figure's ego-network in isolation).
- **Context-aware linked names in the Text tab**: the reader knows which "Nephi" a verse means — *Nephi* in Helaman resolves to Nephi₂, in 3 Nephi to Nephi₃. Hover any name to spotlight that node in the network; click to fly to it.
- **Resizable reading panel** (drag the edge; double-click resets) with the full canon: volume → book → chapter navigation across all 81 books.

## Data & method

- Text: public-domain LDS Scriptures dataset (scriptures.nephi.org, 2020-12-08 edition), preprocessed by `node scripts/build-canon.mjs` into per-book JSON (`public/text/`).
- Characters, relationships, cross-references, and chronology are hand-curated TypeScript datasets (`src/data/`), with Book of Mormon dating following the text's internal year-counts and Old-World pre-monarchy dates flagged as traditional.
- All client-side; no backend, no API keys.

## Develop & deploy

```bash
npm install
npm run dev       # local dev server
npm run build     # production build → dist/
```

`vite.config.ts` uses `base: './'`, so the build deploys to any GitHub Pages subdirectory via the included `.github/workflows/deploy.yml` (push to `main`, set Pages → Source → GitHub Actions).
