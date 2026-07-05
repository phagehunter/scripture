import { useEffect, useState } from 'react';
import { PERSON_BY_ID } from '../data/people';
import { ALL_RELATIONSHIPS } from '../data/relationships';
import { ERA_BY_ID } from '../data/eras';
import { GROUP_COLORS, useAtlas } from '../context/AtlasContext';
import { REL_COLORS, REL_LABELS } from './NetworkGraph';
import { BOOK_BY_SLUG, VOLUME_COLORS } from '../data/canonHelpers';
import { loadRefs } from '../data/refsClient';
import type { BookPair, Relationship } from '../types';

function CitationLink({ citation }: { citation: string }) {
  const { openText } = useAtlas();
  return (
    <button
      onClick={() => openText(citation)}
      className="text-[11px] font-mono text-amber-400/90 hover:text-amber-300 hover:underline whitespace-nowrap"
      title={`Open ${citation} in the Text tab`}
    >
      {citation} ↗
    </button>
  );
}

function RelCard({ r, from }: { r: Relationship; from?: string }) {
  const { setSelection } = useAtlas();
  const other = from ? (r.source === from ? r.target : r.source) : null;
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900/70 p-3 space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        {other ? (
          <button
            onClick={() => setSelection({ kind: 'person', id: other })}
            className="text-sm font-semibold text-slate-100 hover:text-amber-200 text-left"
          >
            {PERSON_BY_ID[r.source]?.name} ↔ {PERSON_BY_ID[r.target]?.name}
          </button>
        ) : (
          <span className="text-sm font-semibold text-slate-100">
            {PERSON_BY_ID[r.source]?.name} ↔ {PERSON_BY_ID[r.target]?.name}
          </span>
        )}
        <span className="text-[10px] px-1.5 py-0.5 rounded-full border whitespace-nowrap" style={{ color: REL_COLORS[r.type], borderColor: REL_COLORS[r.type] }}>
          {REL_LABELS[r.type]}
        </span>
      </div>
      <p className="text-[14.5px] text-slate-200 leading-relaxed">{r.summary}</p>
      {r.citation && (
        <div className="text-right">
          <CitationLink citation={r.citation} />
        </div>
      )}
    </div>
  );
}

/** Browsable verse-pair list for an aggregated book-pair arc. */
function BookPairCard({ pair }: { pair: BookPair }) {
  const { openText } = useAtlas();
  const [rows, setRows] = useState<{ from: string; to: string; curated: boolean }[] | null>(null);
  const [showAll, setShowAll] = useState(false);
  const sBook = BOOK_BY_SLUG[pair.s];
  const tBook = BOOK_BY_SLUG[pair.t];

  useEffect(() => {
    let alive = true;
    setRows(null);
    setShowAll(false);
    loadRefs(pair.s).then((refs) => {
      if (!alive) return;
      const out: { from: string; to: string; curated: boolean }[] = [];
      const tPrefix = `${tBook.title} `;
      for (const [vk, vr] of Object.entries(refs)) {
        for (const r of vr.f) if (r.startsWith(tPrefix)) out.push({ from: `${sBook.title} ${vk}`, to: r, curated: true });
        for (const r of vr.p) if (r.startsWith(tPrefix)) out.push({ from: `${sBook.title} ${vk}`, to: r, curated: false });
      }
      // curated first, then by position in the source book
      out.sort((a, b) => Number(b.curated) - Number(a.curated) || a.from.localeCompare(b.from, undefined, { numeric: true }));
      setRows(out);
    });
    return () => {
      alive = false;
    };
  }, [pair, sBook.title, tBook.title]);

  const shown = rows ? (showAll ? rows.slice(0, 400) : rows.slice(0, 40)) : [];
  return (
    <>
      <div className="font-display text-xl text-slate-50">
        {sBook.title} → {tBook.title}
      </div>
      <div className="text-xs text-slate-500 -mt-2">
        <b className="text-amber-300">{pair.f}</b> footnote reference{pair.f === 1 ? '' : 's'} ·{' '}
        <b className="text-slate-300">{pair.p}</b> phrase-concordance match{pair.p === 1 ? '' : 'es'}
      </div>
      <p className="text-[13px] text-slate-400 leading-relaxed">
        Footnote references come from the official study apparatus; phrase matches are mechanical echoes of
        shared wording — generous by design, best browsed critically. Click any pair to read.
      </p>
      {!rows && <p className="text-sm text-slate-500 italic">Loading verse pairs…</p>}
      {rows && (
        <div className="space-y-1">
          {shown.map((r, i) => (
            <div key={i} className="flex items-center justify-between gap-2 rounded-md border border-slate-800 bg-slate-900/60 px-2 py-1">
              <button onClick={() => openText(r.from)} className="text-[12px] font-mono text-slate-300 hover:text-amber-200 hover:underline">
                {r.from}
              </button>
              <span className={`text-[10px] ${r.curated ? 'text-amber-400' : 'text-slate-600'}`}>{r.curated ? '⇢' : '≈'}</span>
              <button onClick={() => openText(r.to)} className="text-[12px] font-mono text-slate-300 hover:text-amber-200 hover:underline">
                {r.to}
              </button>
            </div>
          ))}
          {rows.length > shown.length && (
            <button onClick={() => setShowAll(true)} className="text-xs text-slate-400 hover:text-slate-200 underline decoration-dotted">
              show more ({rows.length - shown.length} remaining{rows.length > 400 ? ', capped at 400' : ''})
            </button>
          )}
        </div>
      )}
    </>
  );
}

/** Commentary tab: cards for whatever is selected across all three views. */
export default function CommentaryPanel() {
  const { selection, setSelection, focusId, setFocusId, setHighlight } = useAtlas();

  return (
    <div className="h-full overflow-y-auto p-4 space-y-3">
      {selection && (
        <div className="flex justify-end -mb-1">
          <button onClick={() => setSelection(null)} className="text-xs text-slate-500 hover:text-slate-300">
            clear selection ✕
          </button>
        </div>
      )}

      {!selection && (
        <div className="text-[15px] text-slate-300 leading-relaxed space-y-3">
          <p>
            Click a <b className="text-slate-100">character</b> or <b className="text-slate-100">edge</b> in the
            network, an <b className="text-slate-100">arc</b> in the cross-references, or an{' '}
            <b className="text-slate-100">event</b> on the chronology to see commentary, disambiguation, and
            citations here.
          </p>
          <p>
            Every citation links into the <b className="text-slate-100">Text</b> tab. Names in the text are
            context-aware: the reader knows which of the four Nephis a verse means.
          </p>
          <p className="text-[13px] text-slate-500 italic font-reading">
            One canon, two hemispheres, a dozen eras — and a network of quotation binding it together.
          </p>
        </div>
      )}

      {selection?.kind === 'person' && (() => {
        const p = PERSON_BY_ID[selection.id];
        if (!p) return null;
        const involved = ALL_RELATIONSHIPS.filter((r) => r.source === p.id || r.target === p.id);
        return (
          <>
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-display text-xl text-slate-50">{p.name}</span>
              <span className="text-[11px] px-1.5 py-0.5 rounded-full border capitalize whitespace-nowrap" style={{ color: GROUP_COLORS[p.group], borderColor: GROUP_COLORS[p.group] }}>
                {p.group}
              </span>
            </div>
            <div className="italic text-[13.5px] font-reading text-sepia-300 -mt-1">{p.disambiguator}</div>
            <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
              {p.volumes.map((v) => (
                <span key={v} className="px-1.5 py-0.5 rounded-full font-semibold text-slate-950" style={{ background: VOLUME_COLORS[v] }}>
                  {v.toUpperCase()}
                </span>
              ))}
              {p.era > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  {ERA_BY_ID[p.era]?.label}
                </span>
              )}
              {p.collective && (
                <span className="px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  collective ≈{p.collective.toLocaleString()}
                </span>
              )}
            </div>
            <p className="text-[15px] text-slate-100 leading-relaxed">{p.blurb}</p>
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              {p.keyRefs.map((ref) => (
                <CitationLink key={ref} citation={ref} />
              ))}
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setFocusId(focusId === p.id ? null : p.id)}
                className={`text-xs px-2.5 py-1 rounded-md border transition-colors ${
                  focusId === p.id
                    ? 'bg-amber-900/50 border-amber-600/60 text-amber-200'
                    : 'border-slate-600 text-slate-300 hover:border-amber-600/60 hover:text-amber-200'
                }`}
              >
                {focusId === p.id ? 'Exit focus' : 'Focus in network'}
              </button>
              <button
                onClick={() => setHighlight({ id: p.id, focus: true })}
                className="text-xs px-2.5 py-1 rounded-md border border-slate-600 text-slate-300 hover:border-amber-600/60 hover:text-amber-200 transition-colors"
              >
                Spotlight node
              </button>
            </div>
            <div className="text-[11px] uppercase tracking-widest text-slate-500 pt-1">
              Relationships ({involved.length})
            </div>
            {involved.map((r, idx) => (
              <RelCard key={idx} r={r} from={p.id} />
            ))}
          </>
        );
      })()}

      {selection?.kind === 'edge' && (
        <>
          <div className="font-display text-xl text-slate-50">
            {PERSON_BY_ID[selection.a]?.name} ↔ {PERSON_BY_ID[selection.b]?.name}
          </div>
          <div className="text-xs text-slate-500 -mt-2">
            {selection.relationships.length} recorded relationship{selection.relationships.length === 1 ? '' : 's'}
          </div>
          {selection.relationships.map((r, idx) => (
            <RelCard key={idx} r={r} />
          ))}
        </>
      )}

      {selection?.kind === 'crossref' && (() => {
        const c = selection.ref;
        return (
          <>
            <div className="font-display text-xl text-slate-50">
              {c.sourceRef} → {c.targetRef}
            </div>
            <div className="text-xs text-slate-500 -mt-2 capitalize">{c.type} · weight {c.weight}</div>
            <p className="text-[15px] text-slate-100 leading-relaxed">{c.note}</p>
            <div className="rounded-lg border border-slate-700 bg-slate-900/70 p-3 space-y-2">
              <div className="text-[11px] uppercase tracking-widest text-slate-500">Read side by side</div>
              <div className="flex flex-col gap-1 text-sm">
                <CitationLink citation={c.sourceRef} />
                <CitationLink citation={c.targetRef} />
              </div>
              <p className="text-[11px] text-slate-500">
                Tip: open one passage, read it, then come back and open the other — the Text tab keeps your place
                per click.
              </p>
            </div>
          </>
        );
      })()}

      {selection?.kind === 'bookpair' && <BookPairCard pair={selection.pair} />}

      {selection?.kind === 'event' && (() => {
        const e = selection.event;
        const yr = e.year < 0 ? `${Math.abs(Math.round(e.year))} BC` : `AD ${Math.round(e.year)}`;
        return (
          <>
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-display text-xl text-slate-50">{e.label}</span>
              <span className="text-sm text-amber-300 tabular-nums whitespace-nowrap">{yr}</span>
            </div>
            <div className="text-xs text-slate-500 -mt-2">
              {e.track === 'oldworld' ? 'Old World — Bible' : 'New World — Book of Mormon'} · {ERA_BY_ID[e.era]?.label}
            </div>
            {e.detail && <p className="text-[15px] text-slate-100 leading-relaxed">{e.detail}</p>}
            {e.personIds && e.personIds.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {e.personIds.map((id) =>
                  PERSON_BY_ID[id] ? (
                    <button
                      key={id}
                      onClick={() => setSelection({ kind: 'person', id })}
                      className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-200 border border-slate-700 hover:border-amber-600/60 hover:text-amber-200"
                    >
                      {PERSON_BY_ID[id].name}
                    </button>
                  ) : null,
                )}
              </div>
            )}
            {e.citation && (
              <div className="text-right">
                <CitationLink citation={e.citation} />
              </div>
            )}
          </>
        );
      })()}
    </div>
  );
}
