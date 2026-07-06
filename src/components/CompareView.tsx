import { useEffect, useMemo, useState } from 'react';
import { useAtlas } from '../context/AtlasContext';
import { BOOK_BY_SLUG, CANON, VOLUME_COLORS } from '../data/canonHelpers';
import { loadBook, type BookText } from '../data/textClient';
import LinkedVerse from './LinkedVerse';
import type { ReaderLocation } from '../types';

/** One passage pane of the side-by-side Compare view. */
function Pane({ slot }: { slot: 'a' | 'b' }) {
  const { compare, setCompareSlot, openText } = useAtlas();
  const loc = compare[slot];
  const meta = BOOK_BY_SLUG[loc.slug];
  const chapter = Math.min(loc.chapter, meta?.chapters ?? 1);
  const [book, setBook] = useState<BookText | null>(null);

  useEffect(() => {
    let alive = true;
    setBook(null);
    loadBook(loc.slug).then((d) => alive && setBook(d)).catch(() => {});
    return () => {
      alive = false;
    };
  }, [loc.slug]);

  const verses = book?.chapters[chapter - 1] ?? null;

  // Scroll the focused verse into view within this pane.
  useEffect(() => {
    if (!verses || !loc.verse) return;
    const el = document.getElementById(`cmp-${slot}-${loc.verse}`);
    el?.scrollIntoView({ block: 'center' });
  }, [verses, loc.verse, slot]);

  const booksSorted = useMemo(() => CANON, []);

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      {/* pane header */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-slate-800 bg-slate-900/40">
        <span
          className="w-2 h-2 rounded-full shrink-0"
          style={{ background: meta ? VOLUME_COLORS[meta.volume] : '#64748b' }}
          title={meta?.volume.toUpperCase()}
        />
        <select
          value={loc.slug}
          onChange={(e) => setCompareSlot(slot, { slug: e.target.value, chapter: 1 })}
          className="flex-1 min-w-0 bg-slate-900 border border-slate-700 rounded-md px-1.5 py-0.5 text-xs text-slate-200 focus:outline-none focus:border-amber-600"
          aria-label={`Compare pane ${slot} book`}
        >
          {booksSorted.map((b) => (
            <option key={b.slug} value={b.slug}>
              {b.title}
            </option>
          ))}
        </select>
        <select
          value={chapter}
          onChange={(e) => setCompareSlot(slot, { slug: loc.slug, chapter: Number(e.target.value) })}
          className="bg-slate-900 border border-slate-700 rounded-md px-1.5 py-0.5 text-xs text-slate-200 focus:outline-none focus:border-amber-600"
          aria-label={`Compare pane ${slot} chapter`}
        >
          {Array.from({ length: meta?.chapters ?? 1 }, (_, i) => i + 1).map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <button
          onClick={() => openText(`${meta?.title} ${chapter}${loc.verse ? `:${loc.verse}` : ''}`)}
          className="text-[11px] text-slate-400 hover:text-amber-200 whitespace-nowrap"
          title="Open this passage in the Scripture tab"
        >
          open ↗
        </button>
      </div>

      {/* pane text */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3">
        {!verses && <p className="text-sm text-slate-500 italic">Loading…</p>}
        {verses && book && (
          <div className="space-y-2">
            {verses.map((v, i) => {
              const focused = loc.verse === i + 1;
              return (
                <p
                  key={i}
                  id={`cmp-${slot}-${i + 1}`}
                  className={`font-reading text-[14.5px] leading-[1.7] rounded-md ${
                    focused ? 'bg-amber-900/35 ring-1 ring-amber-600/50 px-2 -mx-2 text-slate-50' : 'text-slate-200'
                  }`}
                >
                  <sup className="text-[10px] text-slate-500 font-body font-semibold mr-1.5 select-none">{i + 1}</sup>
                  <LinkedVerse text={v} slug={book.slug} volume={book.volume} />
                </p>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Compare tab: two passages stacked for side-by-side reading — the natural
 * home of every cross-reference. Chips in the Scripture tab land here with
 * both ends of the reference pre-loaded and the cited verses highlighted.
 */
export default function CompareView() {
  const { swapCompare } = useAtlas();
  return (
    <div className="h-full flex flex-col min-h-0">
      <Pane slot="a" />
      <div className="relative border-t border-slate-700">
        <button
          onClick={swapCompare}
          className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-slate-800 border border-slate-600 text-slate-300 hover:text-amber-200 hover:border-amber-600/60 flex items-center justify-center text-sm shadow-lg"
          title="Swap passages"
          aria-label="Swap the two passages"
        >
          ⇅
        </button>
      </div>
      <Pane slot="b" />
    </div>
  );
}
