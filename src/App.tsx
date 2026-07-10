import { useState } from 'react';
import { AtlasProvider } from './context/AtlasContext';
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

export default function App() {
  const [view, setView] = useState<View>('network');

  return (
    <AtlasProvider>
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
              <p className="text-[11px] text-slate-500 mt-1 sm:mt-0.5">
                Project by{' '}
                <a
                  href="https://curtishoffmann.com"
                  target="_blank"
                  rel="noreferrer"
                  className="text-slate-400 hover:text-amber-300 underline decoration-dotted underline-offset-2"
                >
                  Curtis Hoffmann
                </a>
                {' · '}
                <a
                  href="https://forms.gle/J22xpsZJvzWgWrVN6"
                  target="_blank"
                  rel="noreferrer"
                  className="text-slate-400 hover:text-amber-300 underline decoration-dotted underline-offset-2"
                >
                  Share Your Feedback ↗
                </a>
              </p>
            </div>
          </div>
          <nav className="w-full sm:w-auto grid grid-cols-3 sm:flex gap-1 sm:ml-auto">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setView(t.id)}
                title={t.sub}
                className={`px-1 sm:px-3.5 py-2 sm:py-1.5 rounded-md text-[13px] sm:text-[15px] text-center transition-colors border ${
                  view === t.id
                    ? 'bg-amber-900/40 border-amber-600/60 text-amber-200'
                    : 'border-slate-800 sm:border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <span className="sm:hidden">{t.short}</span>
                <span className="hidden sm:inline">{t.label}</span>
              </button>
            ))}
          </nav>
          <a
            href={GUIDE_URL}
            target="_blank"
            rel="noreferrer"
            title="User guide"
            aria-label="Open the user guide"
            className="absolute top-2.5 right-3 sm:static sm:ml-1 w-7 h-7 shrink-0 rounded-full border border-slate-600 text-slate-400 hover:text-amber-200 hover:border-amber-600/60 flex items-center justify-center text-[13px] font-semibold transition-colors"
          >
            ?
          </a>
        </header>

        <ControlsBar />

        <main className="flex-1 flex flex-col md:flex-row min-h-0">
          <section className="flex-1 min-w-0 min-h-0">
            {view === 'network' && <NetworkGraph />}
            {view === 'crossrefs' && <CrossRefArcs />}
            {view === 'chronology' && <ChronologyView />}
          </section>
          <SidePanel />
        </main>
      </div>
    </AtlasProvider>
  );
}
