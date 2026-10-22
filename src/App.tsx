import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { AtlasProvider, useAtlas } from './context/AtlasContext';
import { PERSON_BY_ID } from './data/people';
import { BOOK_BY_SLUG } from './data/canonHelpers';
import ControlsBar from './components/ControlsBar';
import NetworkGraph from './components/NetworkGraph';
import CrossRefArcs from './components/CrossRefArcs';
import ChronologyView from './components/ChronologyView';
import SidePanel from './components/SidePanel';

type View = 'network' | 'crossrefs' | 'chronology';

const TABS: { id: View; label: string; short: string; sub: string }[] = [
  { id: 'network', label: 'Character Network', short: 'Network', sub: '192 figures across four volumes, carefully disambiguated' },
  { id: 'crossrefs', label: 'Cross-References', short: 'Cross-Refs', sub: 'quotation, allusion, fulfillment & typology between the volumes' },
  { id: 'chronology', label: 'Parallel Chronology', short: 'Timeline', sub: 'Old World and New World on one time axis' },
];

/** User guide, hosted as a Google Doc. */
const GUIDE_URL = 'https://docs.google.com/document/d/11qWwthj7PTjc7jW1NmDICVVSdKQHQF6jCMX5ensh4Gg/edit?usp=sharing';

/** Brand mark: the compass-star (after the Liahona, the "director" of 1 Nephi 16). */
function BrandMark() {
  return (
    <svg viewBox="0 0 64 64" className="w-10 h-10 shrink-0" aria-hidden="true">
      <rect width="64" height="64" rx="14" fill="#0f172a" stroke="#334155" strokeWidth="1.5" />
      <circle cx="32" cy="32" r="19" fill="none" stroke="#d9c19a" strokeWidth="2.5" />
      <path d="M32 15 L36.5 27.5 L32 32 L27.5 27.5 Z" fill="#fbbf24" />
      <path d="M32 49 L27.5 36.5 L32 32 L36.5 36.5 Z" fill="#475569" />
      <path d="M15 32 L27.5 27.5 L32 32 L27.5 36.5 Z" fill="#64748b" />
      <path d="M49 32 L36.5 36.5 L32 32 L36.5 27.5 Z" fill="#94a3b8" />
      <circle cx="32" cy="32" r="2.6" fill="#d9c19a" />
    </svg>
  );
}

/** Read a deep link from the URL hash: #person=alma_2 · #book=mosiah&chapter=14 · #view=chronology */
function parseHash(): { view?: View; person?: string; book?: string; chapter?: number } {
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const out: ReturnType<typeof parseHash> = {};
  const v = params.get('view');
  if (v === 'network' || v === 'crossrefs' || v === 'chronology') out.view = v;
  const person = params.get('person');
  if (person && PERSON_BY_ID[person]) out.person = person;
  const book = params.get('book');
  if (book && BOOK_BY_SLUG[book]) {
    out.book = book;
    const c = Number(params.get('chapter'));
    out.chapter = c >= 1 && c <= BOOK_BY_SLUG[book].chapters ? c : 1;
  }
  return out;
}

function AppShell() {
  const [view, setView] = useState<View>(() => parseHash().view ?? 'network');
  const { setSelection, setHighlight, setReaderLoc, setPanelTab } = useAtlas();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Deep links: the static pages (books/, people/) open the app here.
  useEffect(() => {
    const apply = () => {
      const h = parseHash();
      if (h.view) setView(h.view);
      if (h.person) {
        setView(h.view ?? 'network');
        setSelection({ kind: 'person', id: h.person });
        setHighlight({ id: h.person, focus: true });
      } else if (h.book) {
        setReaderLoc({ slug: h.book, chapter: h.chapter ?? 1 });
        setPanelTab('text');
      }
    };
    apply();
    window.addEventListener('hashchange', apply);
    return () => window.removeEventListener('hashchange', apply);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onTabKey = (e: KeyboardEvent<HTMLButtonElement>, idx: number) => {
    const n = TABS.length;
    let next = idx;
    if (e.key === 'ArrowRight') next = (idx + 1) % n;
    else if (e.key === 'ArrowLeft') next = (idx - 1 + n) % n;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = n - 1;
    else return;
    e.preventDefault();
    setView(TABS[next].id);
    tabRefs.current[next]?.focus();
  };

  return (
      <div className="h-full flex flex-col bg-slate-950">
        <header className="relative border-b border-slate-800 px-4 sm:px-5 py-2 sm:py-3 flex flex-wrap items-center gap-x-8 gap-y-1.5">
          <div className="flex items-center gap-3">
            <BrandMark />
            <div>
              <h1 className="font-display font-bold text-[17px] sm:text-[22px] leading-none text-sepia-200 uppercase tracking-[0.14em] sm:tracking-[0.22em]">
                Scripture&thinsp;Atlas
              </h1>
              <p className="hidden sm:block text-[12px] text-slate-400 mt-1 tracking-wide">
                A literary companion to the King James Bible, Book of Mormon &amp; Pearl of Great
                Price
              </p>
              <p className="text-[12px] text-slate-400 mt-1 sm:mt-0.5">
                Project by{' '}
                <a href="https://curtishoffmann.com" className="text-slate-300 hover:text-amber-300 underline decoration-dotted underline-offset-2">
                  Curtis Hoffmann
                </a>
                {' · '}
                <a href="books/" className="text-slate-300 hover:text-amber-300 underline decoration-dotted underline-offset-2">Books</a>
                {' · '}
                <a href="people/" className="text-slate-300 hover:text-amber-300 underline decoration-dotted underline-offset-2">People</a>
                {' · '}
                <a href="chronology/" className="text-slate-300 hover:text-amber-300 underline decoration-dotted underline-offset-2">Chronology</a>
                {' · '}
                <a
                  href="https://forms.gle/J22xpsZJvzWgWrVN6"
                  target="_blank"
                  rel="noreferrer"
                  className="text-slate-300 hover:text-amber-300 underline decoration-dotted underline-offset-2"
                >
                  Feedback form (Google Forms) ↗
                </a>
              </p>
            </div>
          </div>
          <div role="tablist" aria-label="Views" className="w-full sm:w-auto grid grid-cols-3 sm:flex gap-1 sm:ml-auto">
            {TABS.map((t, idx) => (
              <button
                key={t.id}
                ref={(el) => (tabRefs.current[idx] = el)}
                role="tab"
                id={`tab-${t.id}`}
                aria-selected={view === t.id}
                aria-controls={`panel-${t.id}`}
                tabIndex={view === t.id ? 0 : -1}
                onClick={() => setView(t.id)}
                onKeyDown={(e) => onTabKey(e, idx)}
                title={t.sub}
                className={`px-1 sm:px-3.5 py-2 min-h-[40px] rounded-md text-[13px] sm:text-[15px] text-center transition-colors duration-150 border ${
                  view === t.id
                    ? 'bg-amber-900/40 border-amber-600/60 text-amber-200'
                    : 'border-slate-800 sm:border-transparent text-slate-300 hover:text-slate-100 hover:bg-slate-800/60'
                }`}
              >
                <span className="sm:hidden">{t.short}</span>
                <span className="hidden sm:inline">{t.label}</span>
              </button>
            ))}
          </div>
          <a
            href={GUIDE_URL}
            target="_blank"
            rel="noreferrer"
            title="User guide (Google Docs)"
            aria-label="Open the user guide (Google Docs)"
            className="absolute top-2.5 right-3 sm:static sm:ml-1 w-10 h-10 shrink-0 rounded-full border border-slate-600 text-slate-400 hover:text-amber-200 hover:border-amber-600/60 flex items-center justify-center text-[13px] font-semibold transition-colors"
          >
            ?
          </a>
        </header>

        <ControlsBar />

        <main className="flex-1 flex flex-col md:flex-row min-h-0">
          <section id={`panel-${view}`} role="tabpanel" aria-labelledby={`tab-${view}`} className="flex-1 min-w-0 min-h-0">
            {view === 'network' && <NetworkGraph />}
            {view === 'crossrefs' && <CrossRefArcs />}
            {view === 'chronology' && <ChronologyView />}
          </section>
          <SidePanel />
        </main>
      </div>
  );
}

export default function App() {
  return (
    <AtlasProvider>
      <AppShell />
    </AtlasProvider>
  );
}
