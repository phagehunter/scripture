# Scripture Atlas

**Live site: [curtishoffmann.com/scripture](https://curtishoffmann.com/scripture/)**

A literary companion to the King James Bible, the Book of Mormon and the Pearl of Great Price. It reads the three volumes at a distance, through a character network, a cross-reference web and a two-hemisphere chronology, and up close, through commentary, careful disambiguation of same-named figures, and the complete 38,341-verse text readable beside every view.

Everything in the app also exists as a plain page that works without JavaScript: [all 86 books](https://curtishoffmann.com/scripture/books/) with their text, [192 people](https://curtishoffmann.com/scripture/people/), the [annotated cross-references](https://curtishoffmann.com/scripture/cross-references/) and the [parallel chronology](https://curtishoffmann.com/scripture/chronology/).

## The three views

| View | What it shows |
|---|---|
| **Character Network** | 192 figures and collectives across four volumes, force-directed. Node size follows degree centrality, color follows role group, and eight edge types (family, succession, teaching, conflict, alliance, divine encounter, vision, quotation) carry 320 cited relationships. Homonyms carry subscript numbers (Alma₁ and Alma₂, Nephi₁ to Nephi₃, Moroni₁ and Moroni₂) and every entry states parentage or office, so the four Nephis cannot be confused. A "show as table" button lists the same relationships as text. |
| **Cross-References** | Two layers. The *web*: 7,052 verse pairs, 519 from verse-aligned quotation blocks (Isaiah 2 to 14, 48 to 51, 53 and 54, Malachi 3 and 4 and Matthew 5 to 7 as quoted in the Book of Mormon) and 6,533 from the dataset's Bible / Book of Mormon reference listing, which is mechanical and generous and is labeled as such; aggregated into 532 book-to-book arcs with a threshold control. The *annotated highlights*: 63 links with editorial commentary, from the thirteen-chapter Isaiah quotation in 2 Nephi to Genesis and Moses. Any pair opens side by side in the Compare tab, and references appear verse by verse in the reader. |
| **Parallel Chronology** | Old World and New World on one piecewise, zoomable time axis: the Jaredites beside the patriarchs, Lehi departing during Jeremiah's ministry, the darkness of AD 33 marked in both hemispheres, and the Restoration era of the Pearl of Great Price. Also available as a table. |

Global filters (volume chips, a window over the eras, seven role-group toggles), era playback, search with disambiguators, focus mode, a resizable reading panel with Commentary, Compare and Scripture tabs, and context-aware linked names in the reader (*Nephi* in Helaman resolves to Nephi₂, in 3 Nephi to Nephi₃).

Deep links: `#person=alma_2`, `#book=mosiah&chapter=14`, `#view=chronology`. The static pages use them to open the app at the right place.

## Data

Hand-curated and cited, as JSON in `data/`:

| File | Contents |
|---|---|
| `people.json` | 192 figures and collectives: disambiguator, role group, volumes, era, blurb, key references |
| `relationships.json` | 320 typed edges with weight, summary and citation |
| `crossrefs.json` | 63 annotated intertextual links with commentary |
| `chronology.json`, `eras.json` | 62 dated events and 13 eras on two tracks |

Book of Mormon dating follows the text's internal year counts; Old World dates before the monarchy follow traditional reckoning and are flagged as such. Interaction weights are editorial estimates.

`src/data/canon.json` is the book index (86 books, chapter and verse counts). `src/data/nameRules.ts` holds the context-aware name resolution rules.

### The reference corpus

`public/refs/<book>.json` lists, per verse, two kinds of cross-reference:

- `f`: verse-aligned quotation pairs, generated from the text's own 1:1 alignment where the Book of Mormon quotes Isaiah, Malachi and Matthew chapter for chapter (519 pairs).
- `p`: the Bible / Book of Mormon reference listing that ships with the LDS Scriptures dataset (6,533 pairs). It is a mechanical, generous listing and the app labels it that way.

`src/data/refMatrix.json` aggregates both into book-to-book counts. An earlier version of this site also carried references transcribed from the footnotes of the 2013 Latter-day Saint edition, a copyrighted study apparatus; those were removed in October 2026 and `scripts/rebuild-refs.mjs` is the script that rebuilt the corpus without them.

`node scripts/validate-data.mjs` checks that every citation, reference and key passage points to a verse that exists, that the per-book files are symmetric and agree with the matrix, that every relationship and event points to a known person, and that a panel of well-known references is present. It runs at the start of every build.

## Text

The King James Bible, the Book of Mormon and the Pearl of Great Price come from the LDS Scriptures dataset (scriptures.nephi.org, 2020-12-08 edition), which publishes them as public domain. `scripts/build-canon.mjs` turns that dataset's JSON export into `public/text/<book>.json` and `src/data/canon.json`; it expects the dataset folder next to the repository or a path on the command line. The dataset is not committed; the generated files are.

## Develop and build

```bash
npm ci
npm run dev        # Vite dev server
npm run build      # validate data, type-check, build the app, pre-render the static pages into dist/
npm run preview    # serve dist/ locally
npm run refs       # rebuild public/refs and refMatrix.json from the listing and the quotation blocks
```

`scripts/prerender.mjs` runs after the Vite build and writes `dist/books/<slug>/` (full text), `dist/people/<id>/`, `dist/chronology/`, `dist/cross-references/`, two index pages and a sitemap of all the URLs. The pages are plain HTML with their own small stylesheet.

## Deploy

`.github/workflows/deploy.yml` builds on every push to `main` and force-pushes `dist/` to the `gh-pages` branch, which GitHub Pages serves (Settings → Pages → Source: deploy from a branch, `gh-pages`, root). `vite.config.ts` uses `base: './'`, so the build works from the `/scripture/` sub-path of curtishoffmann.com.

## Updating the data

1. Edit the JSON in `data/`. Citations use the book titles in `src/data/canon.json` ("2 Nephi 12:2", "Isaiah 2–14").
2. Run `npm run validate`.
3. Commit; the deploy workflow rebuilds the app and the static pages.

## License

Code: MIT. Data in `data/`: CC BY 4.0. Text and reference listing: public domain per the dataset. See `LICENSE`.
