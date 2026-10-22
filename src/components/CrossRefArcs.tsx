import { useEffect, useMemo, useState } from 'react';
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
 *  · Complete web — every book pair from the reference corpus: verse-aligned
 *    quotation blocks ("f") plus the dataset's Bible / Book of Mormon
 *    reference listing ("p"), arcs weighted by count.
 *  · Annotated highlights — the curated links with editorial commentary.
 */
export default function CrossRefArcs() {
  const { volumes, setSelection } = useAtlas();
  const { ref, width, height: containerH } = useElementSize<HTMLDivElement>();
  const [mode, setMode] = useState<Mode>('web');
  const [sourceMode, setSourceMode] = useState<SourceMode>('fp');
  const [minCount, setMinCount] = useState(4);
  const [hoverPair, setHoverPair] = useState<BookPair | null>(null);
  const [hoverRef, setHoverRef] = useState<CrossRef | null>(null);
  const [showTable, setShowTable] = useState(false);
  // Device detection must use the viewport, NOT the container width — on
  // desktop the reading panel can squeeze this pane well below 640px.
  const [isPhone, setIsPhone] = useState(() => window.matchMedia('(max-width: 767px)').matches);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const onChange = (e: MediaQueryListEvent) => setIsPhone(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // Fill the available vertical space (header block ≈ 150px + legend ≈ 40px).
  const height = Math.max(460, Math.min((containerH || 620) - 190, 780));
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

  // Phones: instead of shrinking the diagram (and its labels) to the screen,
  // give every book a fixed slot and let the whole thing scroll sideways.
  const diagramW = isPhone
    ? Math.max(width - 32, MARGIN.left + 40 + axisBooks.length * 30)
    : width - 32;
  const innerW = Math.max(diagramW - MARGIN.left - (isPhone ? 40 : MARGIN.right), 100);

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
          {/* the full description costs too much height on phones */}
          <p className="hidden sm:block text-xs text-slate-400 max-w-2xl">
            {mode === 'web' ? (
              <>
                The reference web:{' '}
                <b className="text-slate-300">{TOTAL_PAIRS.toLocaleString()} verse pairs</b> from verse-aligned
                quotation blocks and the dataset&apos;s Bible / Book of Mormon reference listing (generous,
                mechanical matches), aggregated by book. Click an arc to browse its verse pairs.
              </>
            ) : (
              <>{CROSSREFS.length} annotated links with editorial commentary, the guided tour of the corpus.</>
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
            <div className="flex items-center gap-3 text-[12px] text-slate-400">
              <label className="flex items-center gap-1.5 cursor-pointer min-h-[40px]" title="The reference listing is mechanical and generous; quotation blocks are verse-aligned direct quotations.">
                <input
                  type="checkbox"
                  checked={sourceMode === 'fp'}
                  onChange={() => setSourceMode(sourceMode === 'f' ? 'fp' : 'f')}
                  className="accent-amber-500 w-4 h-4"
                />
                include the reference listing
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
                <span key={t} className="flex items-center gap-1.5 text-[12px] text-slate-300">
                  <span className="w-4 h-[3px] rounded" style={{ background: TYPE_COLORS[t] }} />
                  {TYPE_LABELS[t]}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {isPhone && (
        <p className="text-[12px] text-slate-400 mb-1">← swipe the diagram sideways · tap an arc for its verse pairs →</p>
      )}
      <button
        type="button"
        onClick={() => setShowTable((v) => !v)}
        aria-pressed={showTable}
        className="mb-2 min-h-[40px] px-3 py-1.5 rounded-md border border-slate-700 bg-slate-900/90 text-[12px] text-slate-200 hover:border-amber-500 transition-colors duration-150"
      >
        {showTable ? 'Show diagram' : 'Show as table'}
      </button>

      {showTable && mode === 'web' && (
        <table className="w-full max-w-3xl text-[13px] text-slate-200 mb-4">
          <caption className="text-left text-slate-400 mb-2">{visiblePairs.length} book pairs at the current threshold, most-linked first.</caption>
          <thead><tr className="text-left text-slate-400 border-b border-slate-700"><th className="py-1 pr-3 font-semibold">From</th><th className="py-1 pr-3 font-semibold">To</th><th className="py-1 pr-3 font-semibold text-right">Aligned</th><th className="py-1 font-semibold text-right">Listing</th></tr></thead>
          <tbody>
            {[...visiblePairs].sort((a, b) => pairCount(b) - pairCount(a)).map((bp) => (
              <tr key={`${bp.s}>${bp.t}`} className="border-b border-slate-800">
                <td className="py-1 pr-3">{BOOK_BY_SLUG[bp.s]?.title}</td>
                <td className="py-1 pr-3">{BOOK_BY_SLUG[bp.t]?.title}</td>
                <td className="py-1 pr-3 tabular-nums text-right">{bp.f}</td>
                <td className="py-1 tabular-nums text-right">{bp.p}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {showTable && mode === 'highlights' && (
        <table className="w-full max-w-3xl text-[13px] text-slate-200 mb-4">
          <caption className="text-left text-slate-400 mb-2">{visibleRefs.length} annotated links for the selected volumes.</caption>
          <thead><tr className="text-left text-slate-400 border-b border-slate-700"><th className="py-1 pr-3 font-semibold">Passages</th><th className="py-1 pr-3 font-semibold">Type</th><th className="py-1 font-semibold">Note</th></tr></thead>
          <tbody>
            {visibleRefs.map((c) => (
              <tr key={c.id} className="border-b border-slate-800 align-top">
                <td className="py-1 pr-3 whitespace-nowrap">{c.sourceRef} → {c.targetRef}</td>
                <td className="py-1 pr-3">{TYPE_LABELS[c.type]}</td>
                <td className="py-1">{c.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {width > 0 && axisBooks.length > 0 && !showTable && (
        <div className="overflow-x-auto">
        <svg width={diagramW} height={height} role="img" aria-label="Arc diagram of cross-references between books; the table view gives the same counts">
          <g transform={`translate(${MARGIN.left},${MARGIN.top})`}>
            {/* ——— arcs ——— */}
            {mode === 'web' &&
              visiblePairs.map((bp) => {
                const active = hoverPair === bp;
                const n = pairCount(bp);
                const w = 0.6 + (Math.log(n) / Math.log(maxCount || 2)) * 6;
                return (
                  <g key={`${bp.s}>${bp.t}`}>
                    <path
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
                    {isPhone && (
                      <path
                        d={arcPath(bp.s, bp.t)}
                        fill="none"
                        stroke="transparent"
                        strokeWidth={14}
                        onClick={() => setSelection({ kind: 'bookpair', pair: bp })}
                      />
                    )}
                  </g>
                );
              })}
            {mode === 'highlights' &&
              visibleRefs.map((c) => {
                const active = hoverRef?.id === c.id;
                const d = arcPath(BOOK_BY_TITLE[c.sourceBook].slug, BOOK_BY_TITLE[c.targetBook].slug);
                return (
                  <g key={c.id}>
                    <path
                      d={d}
                      fill="none"
                      stroke={TYPE_COLORS[c.type]}
                      strokeWidth={active ? 1.5 + c.weight * 1.3 : 0.8 + c.weight * 0.9}
                      strokeOpacity={hoverRef ? (active ? 0.95 : 0.12) : 0.55}
                      className="cursor-pointer"
                      onMouseEnter={() => setHoverRef(c)}
                      onMouseLeave={() => setHoverRef(null)}
                      onClick={() => setSelection({ kind: 'crossref', ref: c })}
                    />
                    {isPhone && (
                      <path d={d} fill="none" stroke="transparent" strokeWidth={14} onClick={() => setSelection({ kind: 'crossref', ref: c })} />
                    )}
                  </g>
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
                    style={{ fontSize: isPhone ? 11 : axisBooks.length > 46 ? 8.5 : 10, fontWeight: emph ? 700 : 400 }}
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
                  <text x={(x1 + x2) / 2} y={axisY + 112} textAnchor="middle" className="text-[12px] font-semibold" fill={VOLUME_COLORS[v]}>
                    {label}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>
        </div>
      )}

      {/* legend for web mode */}
      {mode === 'web' && (
        <div className="mt-1 pt-2 border-t border-slate-800 flex flex-wrap items-center gap-x-6 gap-y-1.5 text-[12px] text-slate-300">
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
          <span className="text-slate-400 whitespace-nowrap">arc thickness ∝ log(reference count) · loops = a book citing itself</span>
        </div>
      )}

      {/* hover tooltips — desktop only: tap already opens the full verse list */}
      {hoverPair && !isPhone && (
        <div className="absolute top-28 right-8 z-30 w-72 bg-slate-900/95 border border-slate-600 rounded-lg p-3 shadow-2xl pointer-events-none">
          <div className="font-display text-sepia-200 text-sm">
            {BOOK_BY_SLUG[hoverPair.s].title} → {BOOK_BY_SLUG[hoverPair.t].title}
          </div>
          <div className="text-xs text-slate-300 mt-1 space-y-0.5">
            <div>Aligned quotation pairs: <b className="text-amber-300 tabular-nums">{hoverPair.f}</b></div>
            <div>Reference-listing pairs: <b className="text-slate-300 tabular-nums">{hoverPair.p}</b></div>
          </div>
          <div className="mt-1.5 text-[12px] text-slate-400">Click to browse the verse pairs</div>
        </div>
      )}
      {hoverRef && !isPhone && (
        <div className="absolute top-28 right-8 z-30 w-80 bg-slate-900/95 border border-slate-600 rounded-lg p-3 shadow-2xl pointer-events-none">
          <div className="flex items-center justify-between gap-2">
            <span className="font-display text-sepia-200 text-sm">
              {hoverRef.sourceRef} → {hoverRef.targetRef}
            </span>
            <span className="text-[12px] px-1.5 py-0.5 rounded-full border" style={{ color: TYPE_COLORS[hoverRef.type], borderColor: TYPE_COLORS[hoverRef.type] }}>
              {hoverRef.type}
            </span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed mt-1.5">{hoverRef.note}</p>
        </div>
      )}
    </div>
  );
}
