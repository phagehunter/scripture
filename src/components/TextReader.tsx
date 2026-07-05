import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useAtlas } from '../context/AtlasContext';
import { BOOK_BY_SLUG, CANON, VOLUME_COLORS, VOLUME_LABELS } from '../data/canonHelpers';
import { NAME_REGEX, resolveName } from '../data/nameRules';
import { PERSON_BY_ID } from '../data/people';
import { loadRefs, type BookRefs } from '../data/refsClient';
import type { Volume } from '../types';

interface BookText {
  volume: Volume;
  title: string;
  slug: string;
  chapters: string[][];
}

/** In-memory cache: each book fetched at most once per session. */
const bookCache = new Map<string, BookText>();

/**
 * Character names are live, CONTEXT-AWARE links: "Nephi" in Helaman resolves
 * to Nephi₂, in 3 Nephi to Nephi₃; "Alma" in the book of Alma is the younger.
 * Hover spotlights the node in the network; click flies the camera to it.
 */
function LinkedVerse({ text, slug, volume }: { text: string; slug: string; volume: Volume }) {
  const { setHighlight } = useAtlas();
  const parts = text.split(NAME_REGEX);
  return (
    <>
      {parts.map((part, idx): ReactNode => {
        const id = resolveName(part, slug, volume);
        if (!id || !PERSON_BY_ID[id]) return part;
        const person = PERSON_BY_ID[id];
        return (
          <span
            key={idx}
            role="button"
            tabIndex={0}
            className="text-amber-300/95 border-b border-dotted border-amber-500/50 cursor-pointer rounded-sm hover:text-amber-200 hover:bg-amber-900/30 transition-colors"
            title={`${person.name} — ${person.disambiguator}`}
            onMouseEnter={() => setHighlight({ id, focus: false })}
            onMouseLeave={() => setHighlight(null)}
            onClick={() => setHighlight({ id, focus: true })}
            onKeyDown={(e) => e.key === 'Enter' && setHighlight({ id, focus: true })}
          >
            {part}
          </span>
        );
      })}
    </>
  );
}

/** Per-verse cross-reference chips: footnote refs first, phrase matches behind an expander. */
function VerseRefs({ refs }: { refs: { f: string[]; p: string[] } }) {
  const { openText } = useAtlas();
  const [showPhrase, setShowPhrase] = useState(false);
  const Chip = ({ r, dim }: { r: string; dim?: boolean }) => (
    <button
      onClick={() => openText(r)}
      className={`text-[10.5px] px-1.5 py-px rounded-full border transition-colors ${
        dim
          ? 'border-slate-700 text-slate-500 hover:text-slate-300 hover:border-slate-500'
          : 'border-amber-700/60 text-amber-300/90 hover:text-amber-200 hover:border-amber-500'
      }`}
      title={dim ? `Phrase parallel: ${r}` : `Footnote reference: ${r}`}
    >
      {r}
    </button>
  );
  return (
    <span className="inline-flex flex-wrap items-center gap-1 ml-2 align-middle">
      {refs.f.slice(0, 6).map((r) => (
        <Chip key={r} r={r} />
      ))}
      {refs.f.length > 6 && <span className="text-[10px] text-slate-500">+{refs.f.length - 6}</span>}
      {refs.p.length > 0 &&
        (showPhrase ? (
          refs.p.slice(0, 8).map((r) => <Chip key={r} r={r} dim />)
        ) : (
          <button
            onClick={() => setShowPhrase(true)}
            className="text-[10px] text-slate-500 hover:text-slate-300 underline decoration-dotted"
            title="Mechanical phrase-concordance parallels — generous matches, browse critically"
          >
            +{refs.p.length} phrase
          </button>
        ))}
    </span>
  );
}

export default function TextReader() {
  const { readerLoc, setReaderLoc } = useAtlas();
  const [book, setBook] = useState<BookText | null>(bookCache.get(readerLoc.slug) ?? null);
  const [refs, setRefs] = useState<BookRefs>({});
  const [showRefs, setShowRefs] = useState(true);
  const [failed, setFailed] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const meta = BOOK_BY_SLUG[readerLoc.slug];
  const chapter = Math.min(readerLoc.chapter, meta?.chapters ?? 1);

  useEffect(() => {
    let alive = true;
    scrollRef.current?.scrollTo({ top: 0 });
    if (bookCache.has(readerLoc.slug)) {
      setBook(bookCache.get(readerLoc.slug)!);
      setFailed(false);
      return;
    }
    setBook(null);
    setFailed(false);
    fetch(`${import.meta.env.BASE_URL}text/${readerLoc.slug}.json`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d: BookText) => {
        bookCache.set(readerLoc.slug, d);
        if (alive) setBook(d);
      })
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [readerLoc.slug]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [chapter]);

  // Cross-reference corpus for this book (footnotes + concordance, both directions).
  useEffect(() => {
    let alive = true;
    setRefs({});
    loadRefs(readerLoc.slug).then((r) => alive && setRefs(r));
    return () => {
      alive = false;
    };
  }, [readerLoc.slug]);

  const booksOfVolume = useMemo(
    () => (meta ? CANON.filter((b) => b.volume === meta.volume) : []),
    [meta],
  );

  const goRelativeChapter = (delta: number) => {
    const target = chapter + delta;
    if (!meta) return;
    if (target >= 1 && target <= meta.chapters) {
      setReaderLoc({ slug: readerLoc.slug, chapter: target });
      return;
    }
    // roll into the previous/next book of the whole canon
    const idx = CANON.findIndex((b) => b.slug === readerLoc.slug);
    const next = CANON[idx + Math.sign(delta)];
    if (next) setReaderLoc({ slug: next.slug, chapter: delta > 0 ? 1 : next.chapters });
  };

  const verses = book?.chapters[chapter - 1] ?? null;

  return (
    <div className="flex flex-col min-h-0 h-full">
      {/* Navigation */}
      <div className="px-4 py-2 border-b border-slate-800 bg-slate-900/40 space-y-1.5">
        <div className="flex items-center gap-1.5">
          {(Object.keys(VOLUME_LABELS) as Volume[]).map((v) => (
            <button
              key={v}
              onClick={() => {
                const first = CANON.find((b) => b.volume === v)!;
                setReaderLoc({ slug: v === meta?.volume ? readerLoc.slug : first.slug, chapter: v === meta?.volume ? chapter : 1 });
              }}
              className={`px-2 py-0.5 rounded-full text-[11px] border transition-colors ${
                meta?.volume === v ? 'font-semibold text-slate-950' : 'text-slate-400 border-slate-700 hover:text-slate-200'
              }`}
              style={meta?.volume === v ? { background: VOLUME_COLORS[v], borderColor: VOLUME_COLORS[v] } : undefined}
            >
              {VOLUME_LABELS[v]}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <select
            value={readerLoc.slug}
            onChange={(e) => setReaderLoc({ slug: e.target.value, chapter: 1 })}
            className="flex-1 bg-slate-900 border border-slate-700 rounded-md px-2 py-1 text-sm text-slate-200 focus:outline-none focus:border-amber-600"
            aria-label="Select book"
          >
            {booksOfVolume.map((b) => (
              <option key={b.slug} value={b.slug}>
                {b.title}
              </option>
            ))}
          </select>
          <button onClick={() => goRelativeChapter(-1)} className="px-2 py-0.5 rounded text-slate-300 hover:bg-slate-800" aria-label="Previous chapter">
            ‹
          </button>
          <select
            value={chapter}
            onChange={(e) => setReaderLoc({ slug: readerLoc.slug, chapter: Number(e.target.value) })}
            className="bg-slate-900 border border-slate-700 rounded-md px-2 py-1 text-sm text-slate-200 focus:outline-none focus:border-amber-600"
            aria-label="Select chapter"
          >
            {Array.from({ length: meta?.chapters ?? 1 }, (_, i) => i + 1).map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <button onClick={() => goRelativeChapter(1)} className="px-2 py-0.5 rounded text-slate-300 hover:bg-slate-800" aria-label="Next chapter">
            ›
          </button>
        </div>
      </div>

      {/* Text body */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4">
        <div className="max-w-[42rem] mx-auto">
          <div className="flex items-baseline justify-between gap-2 mb-3">
            <h3 className="font-display text-2xl text-sepia-200 tracking-wide">
              {meta?.title} {chapter}
            </h3>
            <label className="flex items-center gap-1.5 text-[11px] text-slate-400 cursor-pointer select-none whitespace-nowrap">
              <input type="checkbox" checked={showRefs} onChange={() => setShowRefs(!showRefs)} className="accent-amber-500 w-3 h-3" />
              cross-references
            </label>
          </div>

          {failed && <p className="text-sm text-rose-300">Could not load this book. Try reloading the page.</p>}
          {!failed && !verses && <p className="text-sm text-slate-500 italic">Loading…</p>}

          {verses && book && (
            <div className="space-y-2.5">
              {verses.map((v, i) => {
                const vr = refs[`${chapter}:${i + 1}`];
                return (
                  <p key={i} className="font-reading text-[16px] leading-[1.75] text-slate-100">
                    <sup className="text-[10.5px] text-slate-500 font-body font-semibold mr-1.5 select-none">{i + 1}</sup>
                    <LinkedVerse text={v} slug={book.slug} volume={book.volume} />
                    {showRefs && vr && (vr.f.length > 0 || vr.p.length > 0) && <VerseRefs refs={vr} />}
                  </p>
                );
              })}
            </div>
          )}

          <div className="mt-8 pt-4 border-t border-slate-800 text-[11px] text-slate-500 leading-relaxed space-y-2">
            <p>
              <span className="text-amber-400/80">Names are linked and context-aware</span> — the same name can
              denote different people in different books (four Nephis, two Almas). Hover any name to see who it
              resolves to here and to spotlight them in the network; click to fly to their node.
            </p>
            <p>
              Text: King James Version & Book of Mormon, from the public-domain LDS Scriptures dataset
              (scriptures.nephi.org, 2020 edition).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
