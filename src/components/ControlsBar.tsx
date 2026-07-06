import { useAtlas } from '../context/AtlasContext';
import { VOLUME_COLORS, VOLUME_LABELS } from '../data/canonHelpers';
import { ERA_BY_ID } from '../data/eras';
import type { Volume } from '../types';

/** Global controls: volume chips + era window slider (group toggles live in the network view). */
export default function ControlsBar() {
  const { volumes, toggleVolume, eraRange, setEraRange } = useAtlas();
  const [from, to] = eraRange;
  const pct = (v: number) => ((v - 1) / 11) * 100;

  return (
    <div className="border-b border-slate-800 px-5 py-2.5 flex flex-wrap items-center gap-x-8 gap-y-2 bg-slate-900/40">
      {/* Volume chips */}
      <div className="flex items-center gap-1.5">
        {(Object.keys(VOLUME_LABELS) as Volume[]).map((v) => (
          <button
            key={v}
            onClick={() => toggleVolume(v)}
            className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
              volumes[v] ? 'text-slate-950 font-semibold' : 'text-slate-500 border-slate-700 hover:text-slate-300'
            }`}
            style={volumes[v] ? { background: VOLUME_COLORS[v], borderColor: VOLUME_COLORS[v] } : undefined}
            title={VOLUME_LABELS[v]}
          >
            {VOLUME_LABELS[v]}
          </button>
        ))}
      </div>

      {/* Era window */}
      <div className="flex items-center gap-3 min-w-[280px] flex-1 max-w-xl">
        <span className="text-xs uppercase tracking-widest text-slate-400 whitespace-nowrap">Eras</span>
        <div className="relative flex-1 h-8">
          <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-1 rounded bg-slate-700" />
          <div
            className="absolute top-1/2 -translate-y-1/2 h-1 rounded bg-amber-500/80"
            style={{ left: `${pct(from)}%`, right: `${100 - pct(to)}%` }}
          />
          <input
            type="range" min={1} max={12} value={from}
            onChange={(e) => setEraRange([Math.min(Number(e.target.value), to), to])}
            className="era-thumb absolute inset-0 w-full h-full z-20"
            aria-label="First era"
          />
          <input
            type="range" min={1} max={12} value={to}
            onChange={(e) => setEraRange([from, Math.max(Number(e.target.value), from)])}
            className="era-thumb absolute inset-0 w-full h-full z-30"
            aria-label="Last era"
          />
        </div>
        <span className="font-display font-semibold text-sm text-sepia-200 whitespace-nowrap" title={`${ERA_BY_ID[from].label} → ${ERA_BY_ID[to].label}`}>
          {from === to ? ERA_BY_ID[from].short : `${ERA_BY_ID[from].short} → ${ERA_BY_ID[to].short}`}
        </span>
      </div>
    </div>
  );
}
