import { useAtlas, type PlayMode } from '../context/AtlasContext';
import { ERA_BY_ID } from '../data/eras';

/**
 * Era play-through: animates the global era window across the twelve eras,
 * from the primeval world to Moroni's farewell. State lives in context so
 * playback survives view switches.
 */
export default function PlaybackControls() {
  const { playing, playEra, playMode, setPlayMode, playToggle, playReset } = useAtlas();
  const active = playEra !== null;
  const era = active ? ERA_BY_ID[playEra!] : null;

  return (
    <div className="absolute bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 z-30 max-w-[95vw] flex items-center gap-2 sm:gap-3 bg-slate-900/90 border border-slate-700 rounded-full pl-2 pr-3 sm:pr-4 py-1.5 shadow-xl backdrop-blur-sm">
      <button
        onClick={playToggle}
        className="w-9 h-9 rounded-full bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center justify-center text-sm transition-colors"
        title={playing ? 'Pause' : 'Play through the eras'}
        aria-label={playing ? 'Pause playback' : 'Play through the eras'}
      >
        {playing ? '❚❚' : '▶'}
      </button>

      <div className="w-40 sm:w-64">
        <div className="flex items-baseline justify-between gap-2 min-w-0">
          <span className="text-sm text-slate-100 font-semibold truncate">
            {era ? era.label : 'Play the canon'}
          </span>
          <span className="hidden sm:inline text-[11px] text-slate-400 whitespace-nowrap">
            {active ? `era ${playEra} of 13` : 'era by era'}
          </span>
        </div>
        <div className="mt-1 h-1 rounded bg-slate-700 overflow-hidden">
          <div
            className="h-full bg-amber-400 transition-[width] duration-500 ease-out"
            style={{ width: `${((playEra ?? 0) / 13) * 100}%` }}
          />
        </div>
      </div>

      <div className="hidden sm:flex rounded-md overflow-hidden border border-slate-700 text-[11px]">
        {(
          [
            ['cumulative', 'Growing'],
            ['single', 'By era'],
          ] as [PlayMode, string][]
        ).map(([m, label]) => (
          <button
            key={m}
            onClick={() => setPlayMode(m)}
            className={`px-2 py-1 transition-colors ${
              playMode === m ? 'bg-amber-900/60 text-amber-200' : 'bg-slate-900 text-slate-400 hover:text-slate-200'
            }`}
            title={m === 'cumulative' ? 'Network accumulates from the primeval world' : "Each era's cast in isolation"}
          >
            {label}
          </button>
        ))}
      </div>

      {active && (
        <button onClick={playReset} className="text-slate-400 hover:text-slate-200 text-sm" title="Reset to all eras" aria-label="Reset playback">
          ↺
        </button>
      )}
    </div>
  );
}
