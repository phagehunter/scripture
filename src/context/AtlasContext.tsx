import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { CompareState, Group, Highlight, PanelTab, ReaderLocation, Selection, Volume } from '../types';
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
const PLAY_STEP_MS = 2600;
const HISTORY_LIMIT = 60;

/** One navigation snapshot — everything needed to restore "where you were". */
interface Snapshot {
  panelTab: PanelTab;
  readerLoc: ReaderLocation;
  compare: CompareState;
  selection: Selection | null;
}

interface AtlasState {
  volumes: Record<Volume, boolean>;
  toggleVolume: (v: Volume) => void;
  groups: Record<Group, boolean>;
  toggleGroup: (g: Group) => void;
  eraRange: [number, number];
  setEraRange: (r: [number, number]) => void;
  search: string;
  setSearch: (s: string) => void;
  selection: Selection | null;
  setSelection: (s: Selection | null) => void;
  highlight: Highlight | null;
  setHighlight: (h: Highlight | null) => void;
  focusId: string | null;
  setFocusId: (id: string | null) => void;
  panelTab: PanelTab;
  setPanelTab: (t: PanelTab) => void;
  readerLoc: ReaderLocation;
  setReaderLoc: (l: ReaderLocation) => void;
  /** Jump the sidebar to the Scripture tab at a citation ("Mosiah 14:5"). */
  openText: (citation: string) => void;
  /** Side-by-side view of two passages in the Compare tab. */
  compare: CompareState;
  setCompareSlot: (slot: 'a' | 'b', loc: ReaderLocation) => void;
  swapCompare: () => void;
  openCompare: (a: ReaderLocation, b: ReaderLocation) => void;
  // Navigation history (back/forward through jumps & selections)
  canBack: boolean;
  canForward: boolean;
  goBack: () => void;
  goForward: () => void;
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
  const [volumes, setVolumes] = useState<Record<Volume, boolean>>({ ot: true, nt: true, bom: true, pgp: true });
  const [groups, setGroups] = useState<Record<Group, boolean>>({
    deity: true, prophet: true, ruler: true, disciple: true, adversary: true, kin: true, collective: true,
  });
  const [eraRange, setEraRange] = useState<[number, number]>([1, 13]);
  const [search, setSearch] = useState('');
  const [selection, setSelectionRaw] = useState<Selection | null>(null);
  const [highlight, setHighlight] = useState<Highlight | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [panelTab, setPanelTab] = useState<PanelTab>('commentary');
  const [readerLoc, setReaderLocRaw] = useState<ReaderLocation>({ slug: '1-nephi', chapter: 1 });
  const [compare, setCompare] = useState<CompareState>({
    a: { slug: 'mosiah', chapter: 14, verse: 5 },
    b: { slug: 'isaiah', chapter: 53, verse: 5 },
  });
  const [playing, setPlaying] = useState(false);
  const [playEra, setPlayEra] = useState<number | null>(null);
  const [playMode, setPlayMode] = useState<PlayMode>('cumulative');

  // ——— navigation history ———
  const history = useRef<{ back: Snapshot[]; fwd: Snapshot[] }>({ back: [], fwd: [] });
  const [histVersion, setHistVersion] = useState(0);
  const stateRef = useRef<Snapshot>({ panelTab, readerLoc, compare, selection });
  stateRef.current = { panelTab, readerLoc, compare, selection };

  const pushHistory = () => {
    history.current.back.push({ ...stateRef.current });
    if (history.current.back.length > HISTORY_LIMIT) history.current.back.shift();
    history.current.fwd = [];
    setHistVersion((v) => v + 1);
  };

  const applySnapshot = (s: Snapshot) => {
    setPanelTab(s.panelTab);
    setReaderLocRaw(s.readerLoc);
    setCompare(s.compare);
    setSelectionRaw(s.selection);
  };

  const goBack = () => {
    const s = history.current.back.pop();
    if (!s) return;
    history.current.fwd.push({ ...stateRef.current });
    applySnapshot(s);
    setHistVersion((v) => v + 1);
  };

  const goForward = () => {
    const s = history.current.fwd.pop();
    if (!s) return;
    history.current.back.push({ ...stateRef.current });
    applySnapshot(s);
    setHistVersion((v) => v + 1);
  };

  // Era playback (survives view switches).
  useEffect(() => {
    if (!playing || playEra === null) return;
    if (playEra >= 13) {
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
      // Selecting anything records history and surfaces the Commentary tab.
      setSelection: (s) => {
        if (s) pushHistory();
        setSelectionRaw(s);
        if (s) setPanelTab('commentary');
      },
      highlight,
      setHighlight,
      focusId,
      setFocusId,
      panelTab,
      setPanelTab,
      readerLoc,
      setReaderLoc: (l) => {
        if (l.slug !== readerLoc.slug || l.chapter !== readerLoc.chapter) pushHistory();
        setReaderLocRaw(l);
      },
      openText: (citation) => {
        const loc = parseCitation(citation);
        if (loc) {
          pushHistory();
          setReaderLocRaw(loc);
          setPanelTab('text');
        }
      },
      compare,
      setCompareSlot: (slot, loc) => setCompare((p) => ({ ...p, [slot]: loc })),
      swapCompare: () => setCompare((p) => ({ a: p.b, b: p.a })),
      openCompare: (a, b) => {
        pushHistory();
        setCompare({ a, b });
        setPanelTab('compare');
      },
      canBack: history.current.back.length > 0 && histVersion >= 0,
      canForward: history.current.fwd.length > 0,
      goBack,
      goForward,
      playing,
      playEra,
      playMode,
      setPlayMode,
      playToggle: () => {
        if (playing) {
          setPlaying(false);
        } else {
          if (playEra === null || playEra >= 13) setPlayEra(1);
          setPlaying(true);
        }
      },
      playReset: () => {
        setPlaying(false);
        setPlayEra(null);
        setEraRange([1, 13]);
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [volumes, groups, eraRange, search, selection, highlight, focusId, panelTab, readerLoc, compare, playing, playEra, playMode, histVersion],
  );

  return <AtlasContext.Provider value={value}>{children}</AtlasContext.Provider>;
}

export function useAtlas(): AtlasState {
  const ctx = useContext(AtlasContext);
  if (!ctx) throw new Error('useAtlas must be used within AtlasProvider');
  return ctx;
}
