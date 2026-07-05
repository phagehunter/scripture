import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Group, Highlight, PanelTab, ReaderLocation, Selection, Volume } from '../types';
import { parseCitation } from '../data/canonHelpers';

export const GROUP_LABELS: Record<Group, string> = {
  deity: 'Deity & Angels',
  prophet: 'Prophets & Seers',
  ruler: 'Rulers & Judges',
  disciple: 'Disciples & Missionaries',
  adversary: 'Adversaries',
  kin: 'Households & Kin',
  collective: 'Peoples & Movements',
};

export const GROUP_COLORS: Record<Group, string> = {
  deity: '#a78bfa', // violet
  prophet: '#34d399', // emerald
  ruler: '#fbbf24', // amber
  disciple: '#38bdf8', // sky
  adversary: '#fb7185', // rose
  kin: '#2dd4bf', // teal
  collective: '#94a3b8', // slate
};

export type PlayMode = 'cumulative' | 'single';
const PLAY_STEP_MS = 2600; // eras are heavier than books — a longer dwell

interface AtlasState {
  volumes: Record<Volume, boolean>;
  toggleVolume: (v: Volume) => void;
  groups: Record<Group, boolean>;
  toggleGroup: (g: Group) => void;
  /** Inclusive era window [from, to], 1–12. */
  eraRange: [number, number];
  setEraRange: (r: [number, number]) => void;
  search: string;
  setSearch: (s: string) => void;
  selection: Selection | null;
  setSelection: (s: Selection | null) => void;
  highlight: Highlight | null;
  setHighlight: (h: Highlight | null) => void;
  /** Ego-network isolation: show only this person + direct connections. */
  focusId: string | null;
  setFocusId: (id: string | null) => void;
  panelTab: PanelTab;
  setPanelTab: (t: PanelTab) => void;
  readerLoc: ReaderLocation;
  setReaderLoc: (l: ReaderLocation) => void;
  /** Jump the sidebar to the Text tab at a citation ("Mosiah 14:1-12"). */
  openText: (citation: string) => void;
  // Playback over eras
  playing: boolean;
  playEra: number | null;
  playMode: PlayMode;
  setPlayMode: (m: PlayMode) => void;
  playToggle: () => void;
  playReset: () => void;
}

const AtlasContext = createContext<AtlasState | null>(null);

export function AtlasProvider({ children }: { children: ReactNode }) {
  const [volumes, setVolumes] = useState<Record<Volume, boolean>>({ ot: true, nt: true, bom: true });
  const [groups, setGroups] = useState<Record<Group, boolean>>({
    deity: true, prophet: true, ruler: true, disciple: true, adversary: true, kin: true, collective: true,
  });
  const [eraRange, setEraRange] = useState<[number, number]>([1, 12]);
  const [search, setSearch] = useState('');
  const [selection, setSelection] = useState<Selection | null>(null);
  const [highlight, setHighlight] = useState<Highlight | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [panelTab, setPanelTab] = useState<PanelTab>('commentary');
  const [readerLoc, setReaderLoc] = useState<ReaderLocation>({ slug: '1-nephi', chapter: 1 });
  const [playing, setPlaying] = useState(false);
  const [playEra, setPlayEra] = useState<number | null>(null);
  const [playMode, setPlayMode] = useState<PlayMode>('cumulative');

  // Era playback: advance while playing (lives here so it survives view switches).
  useEffect(() => {
    if (!playing || playEra === null) return;
    if (playEra >= 12) {
      setPlaying(false);
      return;
    }
    const t = setTimeout(() => setPlayEra((e) => (e ?? 1) + 1), PLAY_STEP_MS);
    return () => clearTimeout(t);
  }, [playing, playEra]);

  useEffect(() => {
    if (playEra === null) return;
    setEraRange(playMode === 'cumulative' ? [1, playEra] : [playEra, playEra]);
  }, [playEra, playMode]);

  const value = useMemo<AtlasState>(
    () => ({
      volumes,
      toggleVolume: (v) => setVolumes((p) => ({ ...p, [v]: !p[v] })),
      groups,
      toggleGroup: (g) => setGroups((p) => ({ ...p, [g]: !p[g] })),
      eraRange,
      setEraRange,
      search,
      setSearch,
      selection,
      // Selecting anything surfaces the Commentary tab.
      setSelection: (s) => {
        setSelection(s);
        if (s) setPanelTab('commentary');
      },
      highlight,
      setHighlight,
      focusId,
      setFocusId,
      panelTab,
      setPanelTab,
      readerLoc,
      setReaderLoc,
      openText: (citation) => {
        const loc = parseCitation(citation);
        if (loc) {
          setReaderLoc(loc);
          setPanelTab('text');
        }
      },
      playing,
      playEra,
      playMode,
      setPlayMode,
      playToggle: () => {
        if (playing) {
          setPlaying(false);
        } else {
          if (playEra === null || playEra >= 12) setPlayEra(1);
          setPlaying(true);
        }
      },
      playReset: () => {
        setPlaying(false);
        setPlayEra(null);
        setEraRange([1, 12]);
      },
    }),
    [volumes, groups, eraRange, search, selection, highlight, focusId, panelTab, readerLoc, playing, playEra, playMode],
  );

  return <AtlasContext.Provider value={value}>{children}</AtlasContext.Provider>;
}

export function useAtlas(): AtlasState {
  const ctx = useContext(AtlasContext);
  if (!ctx) throw new Error('useAtlas must be used within AtlasProvider');
  return ctx;
}
