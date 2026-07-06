import { useMemo, useState } from 'react';
import { CHRON_EVENTS } from '../data/chronology';
import { ERAS } from '../data/eras';
import { PERSON_BY_ID } from '../data/people';
import { useAtlas } from '../context/AtlasContext';
import { useElementSize } from '../hooks/useElementSize';
import type { ChronEvent } from '../types';

const MARGIN = { top: 46, right: 24, bottom: 30, left: 24 };
const TRACK_COLORS = { oldworld: '#fbbf24', newworld: '#34d399' } as const;
const TRACK_LABELS = { oldworld: 'Old World — Bible', newworld: 'New World — Book of Mormon' } as const;

/** Format an astronomical year for display. */
const fmtYear = (y: number) => (y < 0 ? `${Math.abs(Math.round(y))} BC` : `AD ${Math.round(y)}`);

/**
 * Parallel chronology: Old-World and New-World tracks on a shared, piecewise
 * time axis (deep past compressed, the well-dated last six centuries BC and
 * first centuries AD expanded). The point of the view: the Book of Mormon
 * runs *alongside* the Bible — Jaredites parallel to the patriarchs, Lehi
 * leaving during Jeremiah's ministry, Christ's sign spanning both hemispheres.
 */
const ZOOM_LEVELS = [1, 1.5, 2.25, 3.5, 5, 7.5];

export default function ChronologyView() {
  const { eraRange, setSelection } = useAtlas();
  const { ref, width } = useElementSize<HTMLDivElement>();
  const [hover, setHover] = useState<ChronEvent | null>(null);
  const [zoomIdx, setZoomIdx] = useState(0);

  const zoom = ZOOM_LEVELS[zoomIdx];
  const height = 560;
  const baseW = Math.max(width - 32, 200);
  const svgW = Math.round(baseW * zoom);
  const innerW = Math.max(svgW - MARGIN.left - MARGIN.right, 100);
  const innerH = height - MARGIN.top - MARGIN.bottom;

  // Piecewise x-scale, three segments: deep past compressed, the well-dated
  // scriptural core expanded, and the long gap to the Restoration compressed.
  // [-2300…-650] → 24% · [-650…450] → 58% · [450…1850] → 18%.
  const x = useMemo(() => {
    const B1 = -650;
    const B2 = 450;
    const f1 = 0.24;
    const f2 = 0.82;
    return (year: number) => {
      if (year <= B1) {
        const t = Math.max(0, (year + 2300) / (B1 + 2300));
        return t * innerW * f1;
      }
      if (year <= B2) {
        return innerW * (f1 + ((year - B1) / (B2 - B1)) * (f2 - f1));
      }
      return innerW * (f2 + Math.min(1, (year - B2) / (1850 - B2)) * (1 - f2));
    };
  }, [innerW]);

  const trackY = { oldworld: innerH * 0.24, newworld: innerH * 0.74 };

  const inWindow = (era: number) => era >= eraRange[0] && era <= eraRange[1];

  // Alternate label offsets per track to reduce collisions.
  const events = useMemo(() => {
    const counters: Record<string, number> = { oldworld: 0, newworld: 0 };
    return CHRON_EVENTS.map((e) => {
      const i = counters[e.track]++;
      return { e, flip: i % 2 === 1 };
    });
  }, []);

  return (
    <div ref={ref} className="relative w-full h-full overflow-y-auto p-4">
      <div className="mb-1 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg text-sepia-200">Parallel Chronology — two hemispheres, one timeline</h2>
          <p className="text-xs text-slate-400 max-w-3xl">
            Bible above, Book of Mormon below, on a shared axis (deep past compressed; dates before the
            monarchy are traditional, Book of Mormon dates follow the text&apos;s internal year-counts).
            Hover events for detail; click to pin commentary. Zoom in on any period and scroll sideways.
          </p>
        </div>
        {/* zoom controls */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setZoomIdx(Math.max(0, zoomIdx - 1))}
            disabled={zoomIdx === 0}
            className="w-7 h-7 rounded-md border border-slate-700 text-slate-300 hover:text-amber-200 hover:border-amber-600/60 disabled:opacity-30 flex items-center justify-center"
            title="Zoom out"
            aria-label="Zoom out"
          >
            −
          </button>
          <span className="text-[11px] text-slate-400 tabular-nums w-12 text-center">{Math.round(zoom * 100)}%</span>
          <button
            onClick={() => setZoomIdx(Math.min(ZOOM_LEVELS.length - 1, zoomIdx + 1))}
            disabled={zoomIdx === ZOOM_LEVELS.length - 1}
            className="w-7 h-7 rounded-md border border-slate-700 text-slate-300 hover:text-amber-200 hover:border-amber-600/60 disabled:opacity-30 flex items-center justify-center"
            title="Zoom in"
            aria-label="Zoom in"
          >
            +
          </button>
          {zoomIdx > 0 && (
            <button
              onClick={() => setZoomIdx(0)}
              className="text-[11px] text-slate-400 hover:text-slate-200 ml-1 underline decoration-dotted"
              title="Reset zoom"
            >
              fit
            </button>
          )}
        </div>
      </div>

      {width > 0 && (
        <div className="overflow-x-auto pb-1">
        <svg
          width={svgW}
          height={height}
          onMouseLeave={() => setHover(null)}
        >
          <g transform={`translate(${MARGIN.left},${MARGIN.top})`}>
            {/* era bands */}
            {ERAS.map((era) => {
              const x1 = x(era.start);
              const x2 = x(era.end);
              const y = trackY[era.track];
              const active = inWindow(era.id);
              return (
                <g key={era.id} opacity={active ? 1 : 0.25}>
                  <rect
                    x={x1}
                    y={y - 13}
                    width={Math.max(x2 - x1, 4)}
                    height={26}
                    rx={6}
                    fill={TRACK_COLORS[era.track]}
                    fillOpacity={0.13}
                    stroke={TRACK_COLORS[era.track]}
                    strokeOpacity={0.45}
                    strokeWidth={1}
                  />
                  {x2 - x1 > 54 && (
                    <text x={(x1 + x2) / 2} y={y + 3.5} textAnchor="middle" className="fill-slate-300 text-[9.5px]">
                      {era.short}
                    </text>
                  )}
                </g>
              );
            })}

            {/* track labels */}
            {(['oldworld', 'newworld'] as const).map((t) => (
              <text key={t} x={0} y={trackY[t] - 26} className="text-[11px] font-semibold" fill={TRACK_COLORS[t]}>
                {TRACK_LABELS[t]}
              </text>
            ))}

            {/* year ticks */}
            {[-2000, -1500, -1000, -600, -400, -200, 1, 200, 400, 1820].map((yr) => (
              <g key={yr}>
                <line x1={x(yr)} x2={x(yr)} y1={0} y2={innerH} stroke="#1e293b" strokeWidth={1} />
                <text x={x(yr)} y={innerH + 16} textAnchor="middle" className="fill-slate-500 text-[10px]">
                  {fmtYear(yr)}
                </text>
              </g>
            ))}

            {/* the crucifixion synchronism: one event, both hemispheres */}
            <line
              x1={x(33)} x2={x(33)}
              y1={trackY.oldworld} y2={trackY.newworld}
              stroke="#e879f9" strokeWidth={1} strokeDasharray="3 3" opacity={0.7}
            />
            <text x={x(33) + 5} y={(trackY.oldworld + trackY.newworld) / 2} className="fill-fuchsia-300 text-[9px]">
              AD 33 — darkness in both hemispheres
            </text>

            {/* events */}
            {events.map(({ e, flip }, idx) => {
              const y = trackY[e.track];
              const ey = flip ? y + 24 : y - 24;
              const active = inWindow(e.era);
              const hovered = hover === e;
              return (
                <g
                  key={idx}
                  opacity={active ? 1 : 0.2}
                  className="cursor-pointer"
                  onMouseEnter={() => setHover(e)}
                  onClick={() => setSelection({ kind: 'event', event: e })}
                >
                  <line x1={x(e.year)} x2={x(e.year)} y1={y} y2={ey} stroke="#475569" strokeWidth={1} />
                  <circle cx={x(e.year)} cy={ey} r={hovered ? 5 : 3.5} fill={TRACK_COLORS[e.track]} stroke="#020617" strokeWidth={1} />
                  {hovered && (
                    <text x={x(e.year)} y={flip ? ey + 16 : ey - 9} textAnchor="middle" className="fill-slate-100 text-[10px] font-semibold">
                      {e.label}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        </svg>
        </div>
      )}

      {/* hover card */}
      {hover && (
        <div className="absolute top-24 right-8 z-30 w-80 bg-slate-900/95 border border-slate-600 rounded-lg p-3 shadow-2xl pointer-events-none">
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-display text-sepia-200 text-sm">{hover.label}</span>
            <span className="text-xs text-amber-300 tabular-nums whitespace-nowrap">{fmtYear(hover.year)}</span>
          </div>
          {hover.detail && <p className="text-xs text-slate-300 leading-relaxed mt-1">{hover.detail}</p>}
          {hover.personIds && hover.personIds.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {hover.personIds.map((id) =>
                PERSON_BY_ID[id] ? (
                  <span key={id} className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                    {PERSON_BY_ID[id].name}
                  </span>
                ) : null,
              )}
            </div>
          )}
          <div className="mt-1.5 text-[10px] text-slate-500">Click to pin in the Commentary panel</div>
        </div>
      )}
    </div>
  );
}
