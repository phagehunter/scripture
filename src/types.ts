/** Shared domain types for the Scripture Atlas. */

export type Volume = 'ot' | 'nt' | 'bom';

/** Role-based grouping used for node colouring and filter toggles. */
export type Group =
  | 'deity' // God the Father, Jesus Christ, angels
  | 'prophet' // prophets, seers, patriarchs in their prophetic role
  | 'ruler' // kings, judges, governors, political leaders
  | 'disciple' // apostles, disciples, missionaries, converts
  | 'adversary' // named antagonists, persecutors, anti-Christs
  | 'kin' // family members & households prominent chiefly through kinship
  | 'collective'; // peoples, movements, bodies (Nephites, Pharisees, Twelve…)

export interface Person {
  id: string;
  /** Display name; homonyms carry the standard subscript numbering
   *  (Alma₁/Alma₂, Nephi₁–₃, Moroni₁/₂) following the chronology charts. */
  name: string;
  /** One-line identity anchor — critical for same-named figures. */
  disambiguator: string;
  group: Group;
  /** Volumes where the figure appears or is substantially discussed. */
  volumes: Volume[];
  /** Primary era id (see ERAS); 0 = trans-temporal (deity). */
  era: number;
  /** Population when this is an aggregate/collective node. */
  collective?: number;
  blurb: string;
  /** Anchor citations, first one used for "read" jumps: "1 Nephi 11" etc. */
  keyRefs: string[];
}

export type RelType =
  | 'family'
  | 'succession' // office passing: prophetic mantle, throne, record-keeping
  | 'teaches' // preaching, conversion, mentorship
  | 'conflict'
  | 'alliance'
  | 'divine' // divine appearance, call, or intervention
  | 'vision' // one sees the other in vision (cross-era edges)
  | 'quotes'; // textual edge: one figure quotes/expounds another's words

export interface Relationship {
  source: string;
  target: string;
  type: RelType;
  /** 1–5 narrative prominence; drives edge thickness. */
  weight: number;
  summary: string;
  citation?: string;
}

export type CrossRefType = 'quotation' | 'allusion' | 'fulfillment' | 'typology';

/** A directed intertextual link between passages, drawn in the arc diagram. */
export interface CrossRef {
  id: string;
  sourceBook: string; // display title, e.g. "Isaiah"
  targetBook: string; // e.g. "2 Nephi"
  sourceRef: string; // "Isaiah 2–14"
  targetRef: string; // "2 Nephi 12–24"
  type: CrossRefType;
  /** Approximate scale (verses/chapters involved); drives arc thickness. */
  weight: number;
  note: string;
}

export interface EraDef {
  id: number;
  label: string;
  short: string;
  /** Astronomical years (negative = BC); traditional/approximate. */
  start: number;
  end: number;
  track: 'oldworld' | 'newworld';
  blurb: string;
}

export interface ChronEvent {
  year: number;
  label: string;
  track: 'oldworld' | 'newworld';
  era: number;
  personIds?: string[];
  citation?: string;
  detail?: string;
}

export type PanelTab = 'commentary' | 'compare' | 'text';

export interface ReaderLocation {
  slug: string; // canon book slug
  chapter: number; // 1-based
  /** Optional verse to scroll to and briefly highlight. */
  verse?: number;
}

/** The two passages shown in the side-by-side Compare tab. */
export interface CompareState {
  a: ReaderLocation;
  b: ReaderLocation;
}

export interface Highlight {
  id: string;
  focus: boolean;
}

/** One aggregated cell of the extracted reference matrix. */
export interface BookPair {
  s: string; // source book slug
  t: string; // target book slug
  f: number; // count of official footnote refs
  p: number; // count of phrase-concordance matches
}

export type Selection =
  | { kind: 'person'; id: string }
  | { kind: 'edge'; a: string; b: string; relationships: Relationship[] }
  | { kind: 'crossref'; ref: CrossRef }
  | { kind: 'bookpair'; pair: BookPair }
  | { kind: 'event'; event: ChronEvent };
