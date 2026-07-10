import { useCallback, useEffect, useRef, useState } from 'react';
import { useAtlas } from '../context/AtlasContext';
import { notifyLayoutChange } from '../hooks/useElementSize';
import CommentaryPanel from './CommentaryPanel';
import CompareView from './CompareView';
import TextReader from './TextReader';
import type { PanelTab } from '../types';

const TABS: { id: PanelTab; label: string }[] = [
  { id: 'commentary', label: 'Commentary' },
  { id: 'compare', label: 'Compare' },
  { id: 'text', label: 'Scripture' },
];

const DEFAULT_WIDTH = 410;
const MIN_WIDTH = 300;
const STORAGE_KEY = 'scripture-atlas-panel-width';

const maxWidth = () => Math.round(window.innerWidth * 0.72);

/**
 * Reading panel, responsive:
 *  · Desktop (≥768px): right sidebar — drag the left edge to resize
 *    (double-click resets), collapsible to a slim rail.
 *  · Mobile (<768px): bottom sheet — stacks under the visualization,
 *    collapsible to a slim bar so the graphics get the whole screen.
 */
export default function SidePanel() {
  const { panelTab, setPanelTab, canBack, canForward, goBack, goForward } = useAtlas();
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 767px)').matches);
  const [width, setWidth] = useState(() => {
    const saved = Number(localStorage.getItem(STORAGE_KEY));
    return saved >= MIN_WIDTH ? Math.min(saved, maxWidth()) : DEFAULT_WIDTH;
  });
  const widthRef = useRef(width);
  widthRef.current = width;

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    notifyLayoutChange();
  }, [width, collapsed, isMobile]);

  const startDrag = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const move = (ev: MouseEvent) => {
      setWidth(Math.min(Math.max(window.innerWidth - ev.clientX, MIN_WIDTH), maxWidth()));
    };
    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      localStorage.setItem(STORAGE_KEY, String(widthRef.current));
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  const historyButtons = (
    <div className="flex items-center mr-1">
      <button
        onClick={goBack}
        disabled={!canBack}
        className="w-7 h-7 rounded-full flex items-center justify-center text-slate-300 hover:bg-slate-800 hover:text-amber-200 disabled:opacity-25 disabled:hover:bg-transparent disabled:hover:text-slate-300 transition-colors"
        title="Back to where you were"
        aria-label="Back"
      >
        ←
      </button>
      <button
        onClick={goForward}
        disabled={!canForward}
        className="w-7 h-7 rounded-full flex items-center justify-center text-slate-300 hover:bg-slate-800 hover:text-amber-200 disabled:opacity-25 disabled:hover:bg-transparent disabled:hover:text-slate-300 transition-colors"
        title="Forward"
        aria-label="Forward"
      >
        →
      </button>
    </div>
  );

  const tabButtons = TABS.map((t) => (
    <button
      key={t.id}
      onClick={() => setPanelTab(t.id)}
      className={`px-2 sm:px-2.5 py-1 rounded-md text-[13px] sm:text-sm transition-colors ${
        panelTab === t.id
          ? 'bg-amber-900/40 text-amber-200 border border-amber-600/50'
          : 'text-slate-400 hover:text-slate-200 border border-transparent'
      }`}
    >
      {t.label}
    </button>
  ));

  const content = (
    <div className="flex-1 min-h-0">
      {panelTab === 'commentary' && <CommentaryPanel />}
      {panelTab === 'compare' && <CompareView />}
      {panelTab === 'text' && <TextReader />}
    </div>
  );

  // ——— Mobile: bottom sheet ———
  if (isMobile) {
    if (collapsed) {
      return (
        <aside className="w-full shrink-0 border-t border-slate-800 bg-slate-950/90">
          <button
            onClick={() => setCollapsed(false)}
            className="w-full py-2.5 text-[11px] uppercase tracking-widest text-slate-400 hover:text-amber-300 flex items-center justify-center gap-2"
            aria-label="Open reading panel"
          >
            <span className="text-sm leading-none">⌃</span> Commentary · Compare · Scripture
          </button>
        </aside>
      );
    }
    return (
      <aside className="w-full h-[46%] shrink-0 border-t border-slate-800 bg-slate-950/95 flex flex-col min-h-0">
        <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-slate-800">
          {historyButtons}
          {tabButtons}
          <button
            onClick={() => setCollapsed(true)}
            className="ml-auto text-slate-500 hover:text-slate-300 px-2 text-sm"
            title="Minimize panel"
            aria-label="Minimize panel"
          >
            ⌄
          </button>
        </div>
        {content}
      </aside>
    );
  }

  // ——— Desktop: right sidebar ———
  if (collapsed) {
    return (
      <aside className="w-9 shrink-0 border-l border-slate-800 bg-slate-950/70 flex flex-col items-center pt-3">
        <button
          onClick={() => setCollapsed(false)}
          className="text-slate-400 hover:text-amber-300 text-lg"
          title="Open reading panel"
          aria-label="Open reading panel"
        >
          ⟨
        </button>
        <span className="mt-4 text-[10px] uppercase tracking-widest text-slate-500 [writing-mode:vertical-rl]">
          Commentary · Compare · Scripture
        </span>
      </aside>
    );
  }

  return (
    <aside className="relative shrink-0 border-l border-slate-800 bg-slate-950/70 flex flex-col min-h-0" style={{ width }}>
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize reading panel"
        title="Drag to resize · double-click to reset"
        onMouseDown={startDrag}
        onDoubleClick={() => {
          setWidth(DEFAULT_WIDTH);
          localStorage.setItem(STORAGE_KEY, String(DEFAULT_WIDTH));
        }}
        className="absolute left-0 top-0 bottom-0 w-2 -ml-1 z-20 cursor-col-resize group"
      >
        <div className="absolute left-1 top-0 bottom-0 w-[3px] bg-transparent group-hover:bg-amber-500/60 group-active:bg-amber-400 transition-colors" />
      </div>

      <div className="flex items-center gap-1 px-2.5 py-2 border-b border-slate-800">
        {historyButtons}
        {tabButtons}
        <button
          onClick={() => setCollapsed(true)}
          className="ml-auto text-slate-500 hover:text-slate-300 px-1.5"
          title="Collapse panel"
          aria-label="Collapse panel"
        >
          ⟩
        </button>
      </div>
      {content}
    </aside>
  );
}
