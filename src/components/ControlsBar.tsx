import { useEffect, useState } from 'react';
import { GROUP_COLORS, GROUP_LABELS, useAtlas } from '../context/AtlasContext';
import { VOLUME_COLORS, VOLUME_LABELS } from '../data/canonHelpers';
import { ERA_BY_ID } from '../data/eras';
import type { Group, Volume } from '../types';

/**
 * Global controls, responsive:
 *  · Desktop: volume chips + era window inline (group toggles live in the
 *    network view's own panel).
 *  · Mobile: one compact "Filters" row summarizing the current state; tap to
 *    expand volumes, eras, AND groups — progressive disclosure so the small
 *    screen isn't busy by default.
 */
export default function ControlsBar() {
  const { volumes, toggleVolume, groups, toggleGroup, eraRange, setEraRange } = useAtlas();
  const [from, to] = eraRange;
  const pct = (v: number) => ((v - 1) / 12) * 100;
  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 767px)').matches);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const eraLabel = from === to ? ERA_BY_ID[from].short : `${ERA_BY_ID[from].short} → ${ERA_BY_ID[to].short}`;
  const volCount = (Object.values(volumes) as boolean[]).filter(Boolean).length;

  const volumeChips = (
    <div className="flex flex-wrap items-center gap-1.5">
      {(Object.keys(VOLUME_LABELS) as Volume[]).map((v) => (
        <button
          key={v}
          onClick={() => toggleVolume(v)}
          className={`px-2.5 py-1.5 md:py-1 rounded-full text-xs border transition-colors whitespace-nowrap ${
            volumes[v] ? 'text-slate-950 font-semibold' : 'text-slate-500 border-slate-700 hover:text-slate-300'
          }`}
          style={volumes[v] ? { background: VOLUME_COLORS[v], borderColor: VOLUME_COLORS[v] } : undefined}
          title={VOLUME_LABELS[v]}
        >
          {VOLUME_LABELS[v]}
        </button>
      ))}
    </div>
  );

  const eraSlider = (
    <div className="flex items-center gap-2.5 md:gap-3 min-w-[230px] flex-1 max-w-xl">
      <span className="text-xs uppercase tracking-widest text-slate-400 whitespace-nowrap">Eras</span>
      <div className="relative flex-1 h-8">
        <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-1 rounded bg-slate-700" />
        <div
          className="absolute top-1/2 -translate-y-1/2 h-1 rounded bg-amber-500/80"
          style={{ left: `${pct(from)}%`, right: `${100 - pct(to)}%` }}
        />
        <input
          type="range" min={1} max={13} value={from}
          onChange={(e) => setEraRange([Math.min(Number(e.target.value), to), to])}
          className="era-thumb absolute inset-0 w-full h-full z-20"
          aria-label="First era"
        />
        <input
          type="range" min={1} max={13} value={to}
          onChange={(e) => setEraRange([from, Math.max(Number(e.target.value), from)])}
          className="era-thumb absolute inset-0 w-full h-full z-30"
          aria-label="Last era"
        />
      </div>
      <span className="font-display font-semibold text-sm text-sepia-200 whitespace-nowrap" title={`${ERA_BY_ID[from].label} → ${ERA_BY_ID[to].label}`}>
        {eraLabel}
      </span>
    </div>
  );

  // ——— Mobile: collapsed summary row, tap to expand everything ———
  if (isMobile) {
    return (
      <div className="border-b border-slate-800 bg-slate-900/40">
        <button
          onClick={() => setOpen(!open)}
          className="w-full px-4 py-2.5 flex items-center justify-between gap-3"
          aria-expanded={open}
        >
          <span className="flex items-baseline gap-2 min-w-0">
            <span className="text-[10px] uppercase tracking-widest text-slate-400 shrink-0">Filters</span>
            <span className="text-[13px] text-slate-300 truncate">
              {volCount === 4 ? 'All volumes' : `${volCount} of 4 volumes`} ·{' '}
              <span className="font-display text-sepia-200">{eraLabel}</span>
            </span>
          </span>
          <span className="text-slate-400 text-sm shrink-0">{open ? '⌄' : '›'}</span>
        </button>
        {open && (
          <div className="px-4 pb-3 space-y-3">
            {volumeChips}
            {eraSlider}
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
              {(Object.keys(GROUP_LABELS) as Group[]).map((g) => (
                <label key={g} className="flex items-center gap-1.5 text-xs text-slate-300 capitalize select-none">
                  <input type="checkbox" checked={groups[g]} onChange={() => toggleGroup(g)} className="accent-amber-500 w-4 h-4" />
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: GROUP_COLORS[g] }} />
                  {g}
                </label>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ——— Desktop: inline ———
  return (
    <div className="border-b border-slate-800 px-4 sm:px-5 py-2 sm:py-2.5 flex flex-wrap items-center gap-x-6 sm:gap-x-8 gap-y-1.5 bg-slate-900/40">
      {volumeChips}
      {eraSlider}
    </div>
  );
}
