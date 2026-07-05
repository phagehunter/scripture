import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { forceX, forceY } from 'd3';
import { PEOPLE, PERSON_BY_ID } from '../data/people';
import { ALL_RELATIONSHIPS } from '../data/relationships';
import { GROUP_COLORS, useAtlas } from '../context/AtlasContext';
import { useElementSize } from '../hooks/useElementSize';
import PlaybackControls from './PlaybackControls';
import type { Person, RelType, Relationship } from '../types';

interface GraphNode {
  id: string;
  person: Person;
  degree: number;
  x?: number;
  y?: number;
}

interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
  weight: number;
  type: RelType;
  relationships: Relationship[];
}

const pairKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);

/** Edge colour per relationship type. */
export const REL_COLORS: Record<RelType, string> = {
  family: '#2dd4bf',
  succession: '#fbbf24',
  teaches: '#34d399',
  conflict: '#fb7185',
  alliance: '#64748b',
  divine: '#a78bfa',
  vision: '#e879f9',
  quotes: '#38bdf8',
};

export const REL_LABELS: Record<RelType, string> = {
  family: 'Family',
  succession: 'Succession',
  teaches: 'Teaching & conversion',
  conflict: 'Conflict',
  alliance: 'Alliance',
  divine: 'Divine encounter',
  vision: 'Seen in vision',
  quotes: 'Quotes / expounds',
};

/** Cross-era, cross-volume textual edges render dashed. */
const DASHED_TYPES: RelType[] = ['vision', 'quotes'];

export default function NetworkGraph() {
  const { volumes, groups, eraRange, search, setSearch, setSelection, highlight, setHighlight, focusId, setFocusId } = useAtlas();
  const { ref, width, height } = useElementSize<HTMLDivElement>();
  const [hoverNode, setHoverNode] = useState<GraphNode | null>(null);
  const mousePos = useRef({ x: 0, y: 0 });
  const fgRef = useRef<any>(null);
  const nodeCache = useRef<Map<string, GraphNode>>(new Map());

  const personVisible = useCallback(
    (id: string) => {
      const p = PERSON_BY_ID[id];
      if (!p) return false;
      if (!groups[p.group]) return false;
      if (p.era !== 0 && (p.era < eraRange[0] || p.era > eraRange[1])) return false;
      return p.volumes.some((v) => volumes[v]);
    },
    [groups, eraRange, volumes],
  );

  const filteredRels = useMemo(() => {
    let rels = ALL_RELATIONSHIPS.filter((r) => personVisible(r.source) && personVisible(r.target));
    if (focusId) {
      rels = rels.filter((r) => r.source === focusId || r.target === focusId);
    }
    return rels;
  }, [personVisible, focusId]);

  const graphData = useMemo(() => {
    const linkMap = new Map<string, GraphLink>();
    const degree = new Map<string, number>();
    for (const r of filteredRels) {
      const key = pairKey(r.source, r.target);
      const existing = linkMap.get(key);
      if (existing) {
        existing.weight += r.weight;
        existing.relationships.push(r);
      } else {
        linkMap.set(key, { source: r.source, target: r.target, weight: r.weight, type: r.type, relationships: [r] });
      }
      degree.set(r.source, (degree.get(r.source) ?? 0) + r.weight);
      degree.set(r.target, (degree.get(r.target) ?? 0) + r.weight);
    }
    const nodes: GraphNode[] = PEOPLE.filter((p) => degree.has(p.id)).map((p) => {
      let node = nodeCache.current.get(p.id);
      if (!node) {
        node = { id: p.id, person: p, degree: 0 };
        nodeCache.current.set(p.id, node);
      }
      node.degree = degree.get(p.id)!;
      return node;
    });
    return { nodes, links: [...linkMap.values()] };
  }, [filteredRels]);

  useEffect(() => {
    const fg = fgRef.current;
    if (!fg) return;
    fg.d3Force('charge')?.strength(-160);
    // Centering gravity keeps disconnected clusters from drifting apart.
    fg.d3Force('x', forceX(0).strength(0.07));
    fg.d3Force('y', forceY(0).strength(0.07));
    const t1 = setTimeout(() => fgRef.current?.zoomToFit(400, 80), 350);
    const t2 = setTimeout(() => fgRef.current?.zoomToFit(400, 80), 1500);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [graphData]);

  // Re-fit when the canvas itself resizes (panel drag).
  useEffect(() => {
    if (!width || !height) return;
    const t = setTimeout(() => fgRef.current?.zoomToFit(300, 80), 250);
    return () => clearTimeout(t);
  }, [width, height]);

  // Clicked name in the reader flies the camera to the node.
  useEffect(() => {
    if (!highlight?.focus) return;
    const node = nodeCache.current.get(highlight.id);
    if (node && node.x !== undefined) fgRef.current?.centerAt(node.x, node.y, 700);
  }, [highlight]);

  const highlightId = highlight?.id ?? null;
  const nodeRadius = (n: GraphNode) => 3 + Math.sqrt(n.degree) * 1.25;

  const drawNode = useCallback(
    (node: any, ctx: CanvasRenderingContext2D, scale: number) => {
      const n = node as GraphNode;
      const r = nodeRadius(n);
      const color = GROUP_COLORS[n.person.group];
      const dimmed = highlightId !== null && n.id !== highlightId;

      ctx.globalAlpha = dimmed ? 0.13 : 0.92;
      ctx.beginPath();
      ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.fill();

      if (n.person.collective) {
        ctx.beginPath();
        ctx.setLineDash([2.5, 2]);
        ctx.arc(node.x, node.y, r + 2.5, 0, 2 * Math.PI);
        ctx.strokeStyle = color;
        ctx.lineWidth = 0.8;
        ctx.stroke();
        ctx.setLineDash([]);
      }

      if (n.id === highlightId) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, r + 3.5, 0, 2 * Math.PI);
        ctx.strokeStyle = '#f8fafc';
        ctx.lineWidth = 1.6;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(node.x, node.y, r + 7, 0, 2 * Math.PI);
        ctx.strokeStyle = 'rgba(251, 191, 36, 0.75)';
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }

      if (scale > 0.85) {
        const fontSize = Math.max(3, 11.5 / scale);
        ctx.font = `600 ${fontSize}px 'Source Sans 3', sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.strokeStyle = 'rgba(2, 6, 23, 0.85)';
        ctx.lineWidth = Math.max(0.8, 3 / scale);
        ctx.lineJoin = 'round';
        ctx.strokeText(n.person.name, node.x, node.y + r + 2);
        ctx.fillStyle = '#e2e8f0';
        ctx.fillText(n.person.name, node.x, node.y + r + 2);
      }
      ctx.globalAlpha = 1;
    },
    [highlightId],
  );

  // Search results (name or disambiguator match, up to 8).
  const searchResults = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (q.length < 2) return [];
    return PEOPLE.filter(
      (p) => p.name.toLowerCase().includes(q) || p.disambiguator.toLowerCase().includes(q),
    ).slice(0, 8);
  }, [search]);

  const hoverConnections = useMemo(() => {
    if (!hoverNode) return [];
    const freq = new Map<string, number>();
    for (const r of filteredRels) {
      const other = r.source === hoverNode.id ? r.target : r.target === hoverNode.id ? r.source : null;
      if (other) freq.set(other, (freq.get(other) ?? 0) + r.weight);
    }
    return [...freq.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([id, w]) => ({ person: PERSON_BY_ID[id], w }));
  }, [hoverNode, filteredRels]);

  return (
    <div
      ref={ref}
      className="relative w-full h-full overflow-hidden"
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        mousePos.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      }}
    >
      {width > 0 && height > 0 && (
        <ForceGraph2D
          ref={fgRef}
          width={width}
          height={height}
          graphData={graphData}
          backgroundColor="#020617"
          nodeVal={(n: any) => nodeRadius(n as GraphNode) ** 2 / 4}
          nodeLabel={() => ''}
          nodeCanvasObject={drawNode}
          nodePointerAreaPaint={(node: any, color, ctx) => {
            ctx.beginPath();
            ctx.arc(node.x, node.y, nodeRadius(node as GraphNode) + 4, 0, 2 * Math.PI);
            ctx.fillStyle = color;
            ctx.fill();
          }}
          linkWidth={(l: any) => 0.7 + Math.min((l as GraphLink).weight * 0.28, 6)}
          linkColor={(l: any) => {
            const link = l as GraphLink;
            const base = REL_COLORS[link.type];
            if (highlightId) {
              const s = typeof link.source === 'object' ? link.source.id : link.source;
              const t = typeof link.target === 'object' ? link.target.id : link.target;
              if (s !== highlightId && t !== highlightId) return 'rgba(51, 65, 85, 0.1)';
              return base;
            }
            return base + '99'; // subdued when nothing highlighted
          }}
          linkLineDash={(l: any) => (DASHED_TYPES.includes((l as GraphLink).type) ? [4, 3] : null)}
          onNodeHover={(node: any) => setHoverNode((node as GraphNode) ?? null)}
          onNodeClick={(node: any) => setSelection({ kind: 'person', id: (node as GraphNode).id })}
          onLinkClick={(l: any) => {
            const link = l as GraphLink;
            const a = typeof link.source === 'object' ? link.source.id : link.source;
            const b = typeof link.target === 'object' ? link.target.id : link.target;
            setSelection({ kind: 'edge', a, b, relationships: link.relationships });
          }}
          cooldownTicks={120}
          d3AlphaDecay={0.035}
          d3VelocityDecay={0.35}
        />
      )}

      {/* Search box */}
      <div className="absolute top-3 left-3 z-30 w-72">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search characters… (e.g. Nephi, Alma, Mary)"
          className="w-full bg-slate-900/90 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-amber-500/70"
        />
        {searchResults.length > 0 && (
          <ul className="mt-1 bg-slate-900/95 border border-slate-700 rounded-lg overflow-hidden divide-y divide-slate-800">
            {searchResults.map((p) => (
              <li key={p.id}>
                <button
                  onClick={() => {
                    setSelection({ kind: 'person', id: p.id });
                    setHighlight({ id: p.id, focus: true });
                    setSearch('');
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-800/80"
                >
                  <span className="text-sm text-slate-100">{p.name}</span>
                  <span className="text-[11px] text-slate-400 ml-2">{p.disambiguator}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Focus-mode banner */}
      {focusId && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 bg-amber-900/60 border border-amber-600/60 rounded-full px-3 py-1 text-xs text-amber-100">
          Focusing on <b>{PERSON_BY_ID[focusId]?.name}</b> and direct connections
          <button onClick={() => setFocusId(null)} className="hover:text-white" title="Exit focus">
            ✕
          </button>
        </div>
      )}

      {/* Legend */}
      <div
        className="absolute bottom-3 left-3 bg-slate-900/85 border border-slate-700 rounded-lg px-3 py-2 text-[11px] space-y-1 pointer-events-none max-w-[240px]"
        style={{ display: width < 950 ? 'none' : undefined }}
      >
        <div className="text-slate-400 uppercase tracking-widest text-[9px] mb-1">Groups</div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
          {Object.entries(GROUP_COLORS).map(([g, c]) => (
            <span key={g} className="flex items-center gap-1.5 text-slate-300 capitalize">
              <span className="w-2 h-2 rounded-full" style={{ background: c }} />
              {g}
            </span>
          ))}
        </div>
        <div className="pt-1 border-t border-slate-700/60 text-slate-400 space-y-0.5">
          <div>◌ dashed ring = collective node</div>
          <div>┄ dashed edge = vision / quotation (crosses eras)</div>
          <div>size ∝ degree centrality · width ∝ weight</div>
        </div>
      </div>

      {/* Hover lookup card */}
      {hoverNode && (
        <div
          className="absolute z-40 w-80 bg-slate-900/95 border border-slate-600 rounded-lg shadow-2xl p-3 pointer-events-none"
          style={{
            left: Math.min(mousePos.current.x + 14, Math.max(width - 330, 0)),
            top: Math.min(mousePos.current.y + 14, Math.max(height - 280, 0)),
          }}
        >
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-display text-lg text-sepia-200">{hoverNode.person.name}</span>
            <span
              className="text-[10px] px-1.5 py-0.5 rounded-full border capitalize whitespace-nowrap"
              style={{ color: GROUP_COLORS[hoverNode.person.group], borderColor: GROUP_COLORS[hoverNode.person.group] }}
            >
              {hoverNode.person.group}
            </span>
          </div>
          <div className="text-xs italic text-sepia-400 mt-0.5">{hoverNode.person.disambiguator}</div>
          <div className="text-xs text-slate-400 mt-1.5 space-y-0.5">
            {hoverNode.person.collective && (
              <div>
                Collective — <span className="text-slate-200">≈{hoverNode.person.collective.toLocaleString()}</span> individuals
              </div>
            )}
            <div>
              Volumes: <span className="text-slate-200 uppercase">{hoverNode.person.volumes.join(' · ')}</span>
              {' · '}Degree: <span className="text-amber-300">{hoverNode.degree}</span>
            </div>
          </div>
          {hoverConnections.length > 0 && (
            <div className="mt-2 pt-1.5 border-t border-slate-700">
              <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">Connections (by weight)</div>
              <ul className="text-xs space-y-0.5">
                {hoverConnections.slice(0, 6).map(({ person, w }) => (
                  <li key={person.id} className="flex justify-between">
                    <span className="flex items-center gap-1.5 text-slate-300">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: GROUP_COLORS[person.group] }} />
                      {person.name}
                    </span>
                    <span className="text-slate-500 tabular-nums">{w}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="mt-1.5 text-[10px] text-slate-500">Click node for full card · click an edge for commentary</div>
        </div>
      )}

      <PlaybackControls />
    </div>
  );
}
