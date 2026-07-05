# Scripture Atlas

A single-page digital-humanities dashboard for the visual literary analysis of the **King James Bible** and the **Book of Mormon** — combining distant reading (network, intertext, and chronology visualizations) with close reading (commentary, careful character disambiguation, and the complete 37,706-verse text readable alongside every view).

## Three analytical dimensions

| View | What it shows |
|---|---|
| **Character Network** | 167 curated figures and collectives across three volumes, force-directed. Node size ∝ degree centrality; color = role group; eight typed edge classes (family, succession, teaching, conflict, alliance, divine encounter, vision, quotation). Homonyms carry standard subscript numbering — Alma₁/Alma₂, Nephi₁–₃, Moroni₁/₂ — following the chronology-chart convention, so the four Nephis can never be confused. Cross-volume edges (Nephi₁ sees Mary in vision; Abinadi expounds Isaiah; the risen Christ dictates Malachi) are the connective tissue. |
| **Cross-References** | Two layers. *Complete web*: **14,031 extracted verse-pairs** — official study-edition footnotes (7,074 curated references) plus a phrase-matching concordance (6,957 mechanical parallels, clearly labelled) — aggregated into 1,114 book-to-book arcs with source and threshold controls; click any arc to browse its verse pairs. *Annotated highlights*: 55 links with editorial commentary, from the thirteen-chapter Isaiah quotation in 2 Nephi to the Sermon on the Mount ↔ Sermon at the Temple. Cross-references also appear **verse by verse in the reader** as clickable chips. |
| **Parallel Chronology** | Old World and New World on one piecewise time axis — Jaredites parallel to the patriarchs, Lehi departing during Jeremiah's ministry, and the AD 33 darkness marked simultaneously in both hemispheres. |

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
