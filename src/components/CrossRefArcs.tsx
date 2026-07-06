import { useMemo, useState } from 'react';
import { CROSSREFS } from '../data/crossrefs';
import refMatrix from '../data/refMatrix.json';
import { BOOK_BY_SLUG, BOOK_BY_TITLE, VOLUME_COLORS, VOLUME_LABELS } from '../data/canonHelpers';
import { useAtlas } from '../context/AtlasContext';
import { useElementSize } from '../hooks/useElementSize';
import type { BookPair, CrossRef, CrossRefType, Volume } from '../types';

const MATRIX = refMatrix as BookPair[];
const TOTAL_PAIRS = MATRIX.reduce((s, bp) => s + bp.f + bp.p, 0);

const TYPE_COLORS: Record<CrossRefType, string> = {
  quotation: '#fbbf24',
  allusion: '#38bdf8',
  fulfillment: '#34d399',
  typology: '#e879f9',
};

const TYPE_LABELS: Record<CrossRefType, string> = {
  quotation: 'Quotation',
  allusion: 'Allusion / parallel',
  fulfillment: 'Prophecy → fulfillment',
  typology: 'Typology',
};

type Mode = 'web' | 'highlights';
type SourceMode = 'f' | 'fp';

const MARGIN = { top: 24, right: 96, bottom: 165, left: 24 };

/**
 * Intertextual view, two layers:
 *  · Complete web — every book-pair from the extracted corpus (14,031 verse
 *    pairs: official footnotes + phrase concordance), arcs weighted by count.
 *  · Annotated highlights — 55 curated links with editorial commentary.
 */
export default function CrossRefArcs() {
  const { volumes, setSelection } = useAtlas();
  const { ref, width, height: containerH } = useElementSize<HTMLDivElement>();
  const [mode, setMode] = useState<Mode>('web');
  const [sourceMode, setSourceMode] = useState<SourceMode>('f');
  const [minCount, setMinCount] = useState(4);
  const [hoverPair, setHoverPair] = useState<BookPair | null>(null);
  const [hoverRef, setHoverRef] = useState<CrossRef | null>(null);

  // Fill the available vertical space (header block ≈ 150px + legend ≈ 40px).
  const height = Math.max(460, Math.min((containerH || 620) - 190, 780));
  const innerW = Math.max(width - 32 - MARGIN.left - MARGIN.right, 100);
  const axisY = height - MARGIN.bottom;

  const pairCount = (bp: BookPair) => (sourceMode === 'f' ? bp.f : bp.f + bp.p);

  // ——— data for the current mode ———
  const visiblePairs = useMemo(() => {
    if (mode !== 'web') return [];
    return MATRIX.filter((bp) => {
      const sv = BOOK_BY_SLUG[bp.s]?.volume;
      const tv = BOOK_BY_SLUG[bp.t]?.volume;
      if (!sv || !tv || !volumes[sv] || !volumes[tv]) return false;
      return pairCount(bp) >= minCount;
    });
  }, [mode, volumes, minCount, sourceMode]);

  const visibleRefs = useMemo(() => {
    if (mode !== 'highlights') return [];
    return CROSSREFS.filter((c) => {
      const sv = BOOK_BY_TITLE[c.sourceBook]?.volume;
      const tv = BOOK_BY_TITLE[c.targetBook]?.volume;
      return sv && tv && volumes[sv] && volumes[tv];
    });
  }, [mode, volumes]);

  // ——— axis: books participating in anything visible, canonical order ———
  const axisBooks = useMemo(() => {
    const slugs = new Set<string>();
    for (const bp of visiblePairs) {
      slugs.add(bp.s);
      slugs.add(bp.t);
    }
    for (const c of visibleRefs) {
      slugs.add(BOOK_BY_TITLE[c.sourceBook].slug);
      slugs.add(BOOK_BY_TITLE[c.targetBook].slug);
    }
    return [...slugs].map((s) => BOOK_BY_SLUG[s]).filter(Boolean).sort((a, b) => a.order - b.order);
  }, [visiblePairs, visibleRefs]);

  const xOf = useMemo(() => {
    const n = axisBooks.length;
    const map = new Map<string, number>();
    axisBooks.forEach((b, i) => map.set(b.slug, n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW));
    return (slug: string) => map.get(slug) ?? 0;
  }, [axisBooks, innerW]);

  // Longest span currently visible — arcs scale to it so the diagram always
  // uses the full height instead of huddling near the axis when filters
  // remove the longest arcs.
  const maxSpan = useMemo(() => {
    let m = 1;
    for (const bp of visiblePairs) m = Math.max(m, Math.abs(xOf(bp.s) - xOf(bp.t)));
    for (const c of visibleRefs)
      m = Math.max(m, Math.abs(xOf(BOOK_BY_TITLE[c.sourceBook].slug) - xOf(BOOK_BY_TITLE[c.targetBook].slug)));
    return m;
  }, [visiblePairs, visibleRefs, xOf]);

  const arcPath = (sSlug: string, tSlug: string) => {
    const x1 = xOf(sSlug);
    const x2 = xOf(tSlug);
    if (sSlug === tSlug) {
      // self-loop (internal references within one book)
      return `M ${x1 - 5} ${axisY} A 9 12 0 1 1 ${x1 + 5} ${axisY}`;
    }
    // Quadratic Bézier: the visual apex sits at half the control-point offset,
    // so double the target height to make the tallest arc actually reach it.
    const apex = 26 + (Math.abs(x2 - x1) / maxSpan) * (axisY - 56);
    return `M ${x1} ${axisY} Q ${(x1 + x2) / 2} ${axisY - 2 * apex} ${x2} ${axisY}`;
  };

  /** Arc colour: PGP arcs purple; Bible↔BoM gold; intra-Bible sky; intra-BoM emerald. */
  const pairColor = (bp: BookPair) => {
    const sv = BOOK_BY_SLUG[bp.s].volume;
    const tv = BOOK_BY_SLUG[bp.t].volume;
    if (sv === 'pgp' || tv === 'pgp') return '#c084fc';
    const cross = (sv === 'bom') !== (tv === 'bom');
    if (cross) return '#fbbf24';
    return sv === 'bom' || tv === 'bom' ? '#34d399' : '#38bdf8';
  };

  const maxCount = useMemo(() => Math.max(1, ...visiblePairs.map(pairCount)), [visiblePairs, sourceMode]);

  return (
    <div ref={ref} className="relative w-full h-full overflow-y-auto p-4">
      <div className="mb-1 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg text-sepia-200">Cross-References</h2>
          <p className="text-xs text-slate-400 max-w-2xl">
            {mode === 'web' ? (
              <>
                The complete extracted reference web:{' '}
                <b className="text-slate-300">{TOTAL_PAIRS.toLocaleString()} verse-pairs</b> from the official
                footnotes and a phrase-matching concordance, aggregated by book. Click an arc to browse its
                verse pairs.
              </>
            ) : (
              <>Fifty-five annotated links with editorial commentary — the guided tour of the corpus.</>
            )}
          </p>
        </div>

        <div className="flex flex-col items-end gap-1.5">
          {/* mode switch */}
          <div className="flex rounded-md overflow-hidden border border-slate-700 text-xs">
            {(
              [
                ['web', 'Complete web'],
                ['highlights', 'Annotated highlights'],
              ] as [Mode, string][]
            ).map(([m, label]) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-2.5 py-1 transition-colors ${
                  mode === m ? 'bg-amber-900/60 text-amber-200' : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {mode === 'web' && (
            <div className="flex items-center gap-3 text-[11px] text-slate-400">
              <label className="flex items-center gap-1.5 cursor-pointer" title="The phrase concordance is mechanical and generous; footnotes are editorially curated.">
                <input
                  type="checkbox"
                  checked={sourceMode === 'fp'}
                  onChange={() => setSourceMode(sourceMode === 'f' ? 'fp' : 'f')}
                  className="accent-amber-500 w-3 h-3"
                />
                include phrase-concordance matches
              </label>
              <label className="flex items-center gap-1.5">
                min refs
                <input
                  type="range" min={1} max={40} value={minCount}
                  onChange={(e) => setMinCount(Number(e.target.value))}
                  className="w-24 accent-amber-500"
                />
                <span className="tabular-nums text-slate-300 w-6">{minCount}</span>
              </label>
            </div>
          )}
          {mode === 'highlights' && (
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              {(Object.keys(TYPE_LABELS) as CrossRefType[]).map((t) => (
                <span key={t} className="flex items-center gap-1.5 text-[11px] text-slate-300">
                  <span className="w-4 h-[3px] rounded" style={{ background: TYPE_COLORS[t] }} />
                  {TYPE_LABELS[t]}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {width > 0 && axisBooks.length > 0 && (
        <svg width={width - 32} height={height}>
          <g transform={`translate(${MARGIN.left},${MARGIN.top})`}>
            {/* ——— arcs ——— */}
            {mode === 'web' &&
              visiblePairs.map((bp) => {
                const active = hoverPair === bp;
                const n = pairCount(bp);
                const w = 0.6 + (Math.log(n) / Math.log(maxCount || 2)) * 6;
                return (
                  <path
                    key={`${bp.s}>${bp.t}`}
                    d={arcPath(bp.s, bp.t)}
                    fill="none"
                    stroke={pairColor(bp)}
                    strokeWidth={active ? w + 1.5 : w}
                    strokeOpacity={hoverPair ? (active ? 0.95 : 0.08) : 0.4}
                    className="cursor-pointer"
                    onMouseEnter={() => setHoverPair(bp)}
                    onMouseLeave={() => setHoverPair(null)}
                    onClick={() => setSelection({ kind: 'bookpair', pair: bp })}
                  />
                );
              })}
            {mode === 'highlights' &&
              visibleRefs.map((c) => {
                const active = hoverRef?.id === c.id;
                return (
                  <path
                    key={c.id}
                    d={arcPath(BOOK_BY_TITLE[c.sourceBook].slug, BOOK_BY_TITLE[c.targetBook].slug)}
                    fill="none"
                    stroke={TYPE_COLORS[c.type]}
                    strokeWidth={active ? 1.5 + c.weight * 1.3 : 0.8 + c.weight * 0.9}
                    strokeOpacity={hoverRef ? (active ? 0.95 : 0.12) : 0.55}
                    className="cursor-pointer"
                    onMouseEnter={() => setHoverRef(c)}
                    onMouseLeave={() => setHoverRef(null)}
                    onClick={() => setSelection({ kind: 'crossref', ref: c })}
                  />
                );
              })}

            {/* ——— axis ——— */}
            <line x1={0} x2={innerW} y1={axisY} y2={axisY} stroke="#334155" strokeWidth={1.5} />
            {axisBooks.map((b) => {
              const emph =
                (hoverPair && (hoverPair.s === b.slug || hoverPair.t === b.slug)) ||
                (hoverRef && (BOOK_BY_TITLE[hoverRef.sourceBook].slug === b.slug || BOOK_BY_TITLE[hoverRef.targetBook].slug === b.slug));
              return (
                <g key={b.slug} transform={`translate(${xOf(b.slug)},${axisY})`}>
                  <circle r={3.5} fill={VOLUME_COLORS[b.volume]} />
                  <text
                    transform="rotate(45)"
                    x={8}
                    y={4}
                    className="fill-slate-300"
                    style={{ fontSize: axisBooks.length > 46 ? 8.5 : 10, fontWeight: emph ? 700 : 400 }}
                  >
                    {b.title.replace('Joseph Smith--', 'JS—')}
                  </text>
                </g>
              );
            })}

            {/* volume span labels (abbreviated when the span is too narrow) */}
            {(['ot', 'nt', 'bom', 'pgp'] as Volume[]).map((v) => {
              const vb = axisBooks.filter((b) => b.volume === v);
              if (!vb.length) return null;
              const x1 = xOf(vb[0].slug);
              const x2 = xOf(vb[vb.length - 1].slug);
              const SHORT: Record<Volume, string> = { ot: 'OT', nt: 'NT', bom: 'BoM', pgp: 'PGP' };
              const label = x2 - x1 > 130 ? VOLUME_LABELS[v] : SHORT[v];
              return (
                <g key={v}>
                  <line x1={x1} x2={x2} y1={axisY + 96} y2={axisY + 96} stroke={VOLUME_COLORS[v]} strokeWidth={2.5} strokeLinecap="round" />
                  <text x={(x1 + x2) / 2} y={axisY + 112} textAnchor="middle" className="text-[11px] font-semibold" fill={VOLUME_COLORS[v]}>
                    {label}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>
      )}

      {/* legend for web mode */}
      {mode === 'web' && (
        <div className="mt-1 pt-2 border-t border-slate-800 flex flex-wrap items-center gap-x-6 gap-y-1.5 text-[11px] text-slate-300">
          <span className="inline-flex items-center gap-2 whitespace-nowrap">
            <span className="inline-block w-5 h-[3px] rounded bg-amber-400" />
            Bible ↔ Book of Mormon
          </span>
          <span className="inline-flex items-center gap-2 whitespace-nowrap">
            <span className="inline-block w-5 h-[3px] rounded bg-emerald-400" />
            within the Book of Mormon
          </span>
          <span className="inline-flex items-center gap-2 whitespace-nowrap">
            <span className="inline-block w-5 h-[3px] rounded bg-purple-400" />
            involving the Pearl of Great Price
          </span>
          <span className="text-slate-500 whitespace-nowrap">arc thickness ∝ log(reference count) · loops = a book citing itself</span>
        </div>
      )}

      {/* hover tooltips */}
      {hoverPair && (
        <div className="absolute top-28 right-8 z-30 w-72 bg-slate-900/95 border border-slate-600 rounded-lg p-3 shadow-2xl pointer-events-none">
          <div className="font-display text-sepia-200 text-sm">
            {BOOK_BY_SLUG[hoverPair.s].title} → {BOOK_BY_SLUG[hoverPair.t].title}
          </div>
          <div className="text-xs text-slate-300 mt-1 space-y-0.5">
            <div>Footnote references: <b className="text-amber-300 tabular-nums">{hoverPair.f}</b></div>
            <div>Phrase-concordance matches: <b className="text-slate-300 tabular-nums">{hoverPair.p}</b></div>
          </div>
          <div className="mt-1.5 text-[10px] text-slate-500">Click to browse the verse pairs</div>
        </div>
      )}
      {hoverRef && (
        <div className="absolute top-28 right-8 z-30 w-80 bg-slate-900/95 border border-slate-600 rounded-lg p-3 shadow-2xl pointer-events-none">
          <div className="flex items-center justify-between gap-2">
            <span className="font-display text-sepia-200 text-sm">
              {hoverRef.sourceRef} → {hoverRef.targetRef}
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full border" style={{ color: TYPE_COLORS[hoverRef.type], borderColor: TYPE_COLORS[hoverRef.type] }}>
              {hoverRef.type}
            </span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed mt-1.5">{hoverRef.note}</p>
        </div>
      )}
    </div>
  );
}
