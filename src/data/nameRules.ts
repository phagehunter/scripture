import type { Volume } from '../types';

/**
 * Context-sensitive name → character resolution for the Text reader.
 *
 * The same name often denotes different people in different books ("Nephi" is
 * four people; "Alma" two; "Jacob", "Joseph", "Aaron", "Ammon", "Lehi",
 * "Samuel", "Noah", "Gideon", "Ishmael" all collide across volumes). Rules are
 * evaluated top-down per name: the first rule whose book/volume scope matches
 * the reader's current location wins; a rule with no scope is the default.
 *
 * Multi-word aliases (e.g. "John the Baptist", "brother of Jared") are matched
 * before single names, so the bare-name fallbacks only see what remains.
 * Editorial approximations are noted in the character cards themselves.
 */

export interface NameRule {
  /** Book slugs where this rule applies (takes precedence over volume). */
  books?: string[];
  /** Volume where this rule applies. */
  volume?: Volume;
  id: string;
}

export const NAME_RULES: Record<string, NameRule[]> = {
  // ——— Deity ———
  'Jesus Christ': [{ id: 'jesus_christ' }],
  'Jesus': [{ id: 'jesus_christ' }],
  'Christ': [{ id: 'jesus_christ' }],
  'Messiah': [{ id: 'jesus_christ' }],
  'Jehovah': [{ id: 'jesus_christ' }],
  'Lamb of God': [{ id: 'jesus_christ' }],
  'Only Begotten': [{ id: 'jesus_christ' }],
  'Satan': [{ id: 'satan' }],
  'devil': [{ id: 'satan' }],
  'Lucifer': [{ id: 'satan' }],
  'Gabriel': [{ id: 'gabriel' }],

  // ——— The great homonym clusters ———
  Nephi: [
    { books: ['helaman'], id: 'nephi_2' },
    { books: ['3-nephi', '4-nephi'], id: 'nephi_3' },
    { volume: 'bom', id: 'nephi_1' },
  ],
  Alma: [
    { books: ['alma'], id: 'alma_2' },
    { volume: 'bom', id: 'alma_1' }, // Mosiah default: the elder (the younger's rise is flagged in his card)
  ],
  Helaman: [
    { books: ['helaman'], id: 'helaman_3' },
    { volume: 'bom', id: 'helaman_2' },
  ],
  Moroni: [
    { books: ['alma'], id: 'captain_moroni' },
    { volume: 'bom', id: 'moroni_2' },
    { volume: 'pgp', id: 'moroni_2' }, // the messenger of Joseph Smith--History
  ],
  'Joseph Smith': [{ id: 'joseph_smith' }],
  Mormon: [
    { books: ['mosiah'], id: 'alma_1' }, // "waters of Mormon" context — the place; nearest figure is Alma₁ (noted in card)
    { volume: 'bom', id: 'mormon' },
  ],
  Lehi: [
    { books: ['alma'], id: 'lehi_3' },
    { books: ['helaman'], id: 'lehi_4' },
    { volume: 'bom', id: 'lehi_1' },
  ],
  Jacob: [
    { volume: 'bom', id: 'jacob_2' },
    { id: 'jacob_israel' },
  ],
  Joseph: [
    { volume: 'nt', id: 'joseph_nazareth' },
    { books: ['2-nephi'], id: 'joseph_egypt' }, // 2 Nephi 3 is about Joseph of Egypt
    { volume: 'bom', id: 'joseph_2' },
    { id: 'joseph_egypt' },
  ],
  Aaron: [
    { volume: 'bom', id: 'aaron_3' },
    { id: 'aaron_ot' },
  ],
  Ammon: [
    { books: ['mosiah'], id: 'ammon_1' },
    { volume: 'bom', id: 'ammon_2' },
  ],
  Samuel: [
    { volume: 'bom', id: 'samuel_lamanite' },
    { id: 'samuel_ot' },
  ],
  Noah: [
    { volume: 'bom', id: 'king_noah' },
    { id: 'noah_ot' },
  ],
  Gideon: [
    { volume: 'bom', id: 'gideon_bom' },
    { id: 'gideon_ot' },
  ],
  Ishmael: [
    { volume: 'bom', id: 'ishmael_bom' },
    { id: 'ishmael_ot' },
  ],
  Laban: [
    { volume: 'bom', id: 'laban_bom' },
    // OT Laban (Jacob's uncle) is not catalogued; bare OT "Laban" stays unlinked.
  ],
  Saul: [
    { books: ['acts'], id: 'paul' },
    { volume: 'ot', id: 'saul_king' },
  ],
  Mary: [
    // Bare "Mary" in the Gospels defaults to the mother of Jesus; the
    // Magdalene and Bethany Marys are matched by their fuller epithets first.
    { volume: 'nt', id: 'mary_mother' },
    { volume: 'bom', id: 'mary_mother' }, // Mosiah 3:8 names her prophetically
  ],
  John: [
    // Bare "John" defaults to the apostle; the Baptist is caught by epithet.
    { volume: 'nt', id: 'john_beloved' },
    { volume: 'bom', id: 'john_beloved' }, // 1 Nephi 14, 3 Nephi 28
    { volume: 'pgp', id: 'john_beloved' }, // "Peter, James and John" of the history
  ],
  James: [
    { volume: 'nt', id: 'james_zebedee' },
    { volume: 'pgp', id: 'james_brother' }, // "the epistle of James" in Joseph Smith--History 1:11
  ],
  Judas: [{ volume: 'nt', id: 'judas_iscariot' }],
  Simon: [{ volume: 'nt', id: 'peter' }],
  Timothy: [{ volume: 'nt', id: 'timothy_nt' }],
  Zacharias: [{ volume: 'nt', id: 'zacharias_nt' }],
  Enoch: [{ id: 'enoch_ot' }],
  Enos: [{ id: 'enos_bom' }],
  Micah: [{ id: 'micah_ot' }],
  Jared: [{ volume: 'bom', id: 'jared_bom' }],
  Benjamin: [{ volume: 'bom', id: 'king_benjamin' }], // OT tribe references stay unlinked via volume scope
  Esaias: [{ id: 'isaiah' }],
  Isaiah: [{ id: 'isaiah' }],
  Elias: [{ volume: 'nt', id: 'elijah' }], // KJV NT form of Elijah
  Jeremy: [{ volume: 'nt', id: 'jeremiah' }],
  Sam: [{ volume: 'bom', id: 'sam_bom' }],

  // ——— Multi-word epithets (matched before bare names) ———
  'John the Baptist': [{ id: 'john_baptist' }],
  'Mary Magdalene': [{ id: 'mary_magdalene' }],
  'brother of Jared': [{ id: 'brother_of_jared' }],
  'Son of God': [{ id: 'jesus_christ' }],
  'Son of man': [{ id: 'jesus_christ' }],
  'Holy One of Israel': [{ id: 'jesus_christ' }],

  // ——— Unambiguous figures ———
  Adam: [{ id: 'adam' }], Eve: [{ id: 'eve' }], Cain: [{ id: 'cain' }], Abel: [{ id: 'abel' }], Seth: [{ id: 'seth' }],
  Abraham: [{ id: 'abraham' }], Abram: [{ id: 'abraham' }], Sarah: [{ id: 'sarah' }], Sarai: [{ id: 'sarah' }],
  Hagar: [{ id: 'hagar' }], Isaac: [{ id: 'isaac' }], Rebekah: [{ id: 'rebekah' }], Esau: [{ id: 'esau' }],
  Rachel: [{ id: 'rachel' }], Leah: [{ id: 'leah' }], Judah: [{ books: ['genesis'], id: 'judah_ot' }],
  Israel: [{ books: ['genesis'], id: 'jacob_israel' }],
  Job: [{ id: 'job' }], Moses: [{ id: 'moses' }], Miriam: [{ id: 'miriam' }], Pharaoh: [{ books: ['exodus'], id: 'pharaoh_exodus' }],
  Joshua: [{ id: 'joshua' }], Deborah: [{ id: 'deborah' }], Samson: [{ id: 'samson' }],
  Ruth: [{ id: 'ruth' }], Naomi: [{ id: 'naomi' }], Boaz: [{ id: 'boaz' }], Hannah: [{ id: 'hannah' }], Eli: [{ id: 'eli' }],
  Jonathan: [{ books: ['1-samuel'], id: 'jonathan' }], David: [{ id: 'david' }], Goliath: [{ id: 'goliath' }],
  Nathan: [{ volume: 'ot', id: 'nathan_prophet' }], Bathsheba: [{ id: 'bathsheba' }], Solomon: [{ id: 'solomon' }],
  Rehoboam: [{ id: 'rehoboam' }], Jeroboam: [{ id: 'jeroboam' }], Ahab: [{ id: 'ahab' }], Jezebel: [{ id: 'jezebel' }],
  Elijah: [{ id: 'elijah' }], Elisha: [{ id: 'elisha' }], Jonah: [{ id: 'jonah' }], Jonas: [{ volume: 'nt', id: 'jonah' }],
  Hezekiah: [{ id: 'hezekiah' }], Josiah: [{ id: 'josiah' }], Jeremiah: [{ id: 'jeremiah' }],
  Ezekiel: [{ id: 'ezekiel' }], Daniel: [{ id: 'daniel' }], Nebuchadnezzar: [{ id: 'nebuchadnezzar' }],
  Esther: [{ id: 'esther' }], Mordecai: [{ id: 'mordecai' }], Ezra: [{ id: 'ezra' }], Nehemiah: [{ id: 'nehemiah' }],
  Malachi: [{ id: 'malachi' }], Zenos: [{ id: 'zenos' }], Zenock: [{ id: 'zenock' }],
  Peter: [{ id: 'peter' }], Cephas: [{ id: 'peter' }], Andrew: [{ id: 'andrew' }], Thomas: [{ id: 'thomas_apostle' }],
  Matthew: [{ id: 'matthew_apostle' }], Martha: [{ id: 'martha' }], Lazarus: [{ books: ['john'], id: 'lazarus' }],
  Nicodemus: [{ id: 'nicodemus' }], Pilate: [{ id: 'pilate' }], Caiaphas: [{ id: 'caiaphas' }],
  Herod: [{ books: ['matthew'], id: 'herod_great' }, { id: 'herod_antipas' }],
  Elisabeth: [{ id: 'elisabeth' }], Stephen: [{ id: 'stephen' }], Paul: [{ id: 'paul' }],
  Barnabas: [{ id: 'barnabas' }], Luke: [{ id: 'luke_evangelist' }], Marcus: [{ id: 'mark_evangelist' }],
  Sariah: [{ id: 'sariah' }], Laman: [{ id: 'laman_1' }], Lemuel: [{ id: 'lemuel' }], Zoram: [{ id: 'zoram_1' }],
  Sherem: [{ id: 'sherem' }], Mosiah: [{ books: ['omni', 'words-of-mormon'], id: 'mosiah_1' }, { id: 'mosiah_2' }],
  Zarahemla: [{ books: ['omni'], id: 'zarahemla_mulek' }], Zeniff: [{ id: 'zeniff' }],
  Abinadi: [{ id: 'abinadi' }], Limhi: [{ id: 'limhi' }], Amulon: [{ id: 'amulon' }],
  Amulek: [{ id: 'amulek' }], Zeezrom: [{ id: 'zeezrom' }], Nehor: [{ id: 'nehor' }], Korihor: [{ id: 'korihor' }],
  Lamoni: [{ id: 'lamoni' }], Abish: [{ id: 'abish' }],
  Teancum: [{ id: 'teancum' }], Amalickiah: [{ id: 'amalickiah' }], Ammoron: [{ id: 'ammoron' }],
  Pahoran: [{ id: 'pahoran_1' }], Kishkumen: [{ id: 'kishkumen' }], Gadianton: [{ id: 'gadianton' }],
  Ammaron: [{ id: 'ammaron' }], Ether: [{ id: 'ether' }], Akish: [{ id: 'akish' }],
  Coriantumr: [{ id: 'coriantumr_last' }],

  // ——— Willmington-list additions (Bible figures) ———
  Balaam: [{ id: 'balaam' }],
  Belshazzar: [{ id: 'belshazzar' }],
  Caleb: [{ id: 'caleb' }],
  Cyrus: [{ id: 'cyrus' }],
  Hosea: [{ id: 'hosea_prophet' }],
  Melchizedek: [{ id: 'melchizedek' }],
  Melchisedec: [{ id: 'melchizedek' }], // KJV NT spelling
  Methuselah: [{ id: 'methuselah' }],
  Naaman: [{ id: 'naaman' }],
  Rahab: [{ id: 'rahab' }],
  Rachab: [{ id: 'rahab' }], // KJV Matthew 1:5
  Zerubbabel: [{ id: 'zerubbabel' }],
  Zorobabel: [{ id: 'zerubbabel' }], // KJV NT spelling
  Nathanael: [{ id: 'nathanael' }],
  Bartholomew: [{ id: 'nathanael' }],
  Zacchaeus: [{ id: 'zacchaeus' }],
  Cornelius: [{ id: 'cornelius' }],
  Lydia: [{ id: 'lydia' }],
  Silas: [{ id: 'silas' }],
  Priscilla: [{ id: 'priscilla' }],
  Aquila: [{ id: 'aquila' }],
  Apollos: [{ id: 'apollos' }],
  Titus: [{ volume: 'nt', id: 'titus_nt' }],
  Philemon: [{ id: 'philemon_nt' }],
  Ananias: [{ id: 'ananias_damascus' }], // bare-name default; the high priest & Sapphira's husband stay unlinked contextually
  Philip: [
    { books: ['acts'], id: 'philip_evangelist' },
    { volume: 'nt', id: 'philip_apostle' },
  ],

  // ——— Collectives ———
  Nephites: [{ id: 'nephites' }], Lamanites: [{ id: 'lamanites' }], Zoramites: [{ id: 'zoramites_bom' }],
  Jaredites: [{ id: 'jaredites' }], Pharisees: [{ id: 'pharisees' }], Samaritans: [{ id: 'samaritans' }],
  Philistines: [{ id: 'philistines' }],
  'Anti-Nephi-Lehies': [{ id: 'people_of_ammon' }],
  'people of Ammon': [{ id: 'people_of_ammon' }],
};

/** All alias strings, longest first, for regex alternation. */
export const NAME_ALIASES = Object.keys(NAME_RULES).sort((a, b) => b.length - a.length);

export const NAME_REGEX = new RegExp(`\\b(${NAME_ALIASES.join('|')})\\b`);

/** Resolve an alias in a given reader context (book slug + volume). */
export function resolveName(alias: string, bookSlug: string, volume: Volume): string | null {
  const rules = NAME_RULES[alias];
  if (!rules) return null;
  for (const r of rules) {
    if (r.books && r.books.includes(bookSlug)) return r.id;
    if (r.books) continue;
    if (r.volume && r.volume !== volume) continue;
    return r.id;
  }
  return null;
}
