import type { EraDef } from '../types';

/**
 * Twelve eras spanning both hemispheres of the canon, ordered by approximate
 * start date. Old-World dates before the monarchy follow traditional biblical
 * chronology and are symbolic/approximate; Book of Mormon dates follow the
 * text's internal year-counts (reckoned from Lehi's departure, the judges,
 * and the sign of Christ's birth) as compiled in the chronology charts
 * included with the source dataset.
 */
export const ERAS: EraDef[] = [
  { id: 1, label: 'Primeval World', short: 'Primeval', start: -4000, end: -2400, track: 'oldworld',
    blurb: 'Creation, Eden, the first family, and the Flood — the canon\'s mythic-primeval prologue (traditional dates are symbolic).' },
  { id: 2, label: 'The Jaredites', short: 'Jaredites', start: -2300, end: -580, track: 'newworld',
    blurb: 'From the great tower to the plains of Agosh: a whole parallel civilization compressed into the book of Ether, ending in mutual annihilation shortly before the Mulekites find its last king.' },
  { id: 3, label: 'The Patriarchs', short: 'Patriarchs', start: -2000, end: -1600, track: 'oldworld',
    blurb: 'Abraham to Joseph: covenant, promised seed, and the descent into Egypt.' },
  { id: 4, label: 'Exodus & Wilderness', short: 'Exodus', start: -1600, end: -1400, track: 'oldworld',
    blurb: 'Bondage, deliverance, Sinai, and forty years of wandering (traditional dating).' },
  { id: 5, label: 'Conquest & Judges', short: 'Judges', start: -1400, end: -1050, track: 'oldworld',
    blurb: 'Joshua\'s conquest and the cyclical age of the judges — "every man did that which was right in his own eyes."' },
  { id: 6, label: 'United Monarchy', short: 'Monarchy', start: -1050, end: -930, track: 'oldworld',
    blurb: 'Saul, David, and Solomon: the kingdom united, the temple built.' },
  { id: 7, label: 'Divided Kingdoms & the Prophets', short: 'Prophets', start: -930, end: -586, track: 'oldworld',
    blurb: 'Israel and Judah, Elijah to Jeremiah — the great prophetic age from which Lehi departs.' },
  { id: 8, label: 'Exile & Return', short: 'Exile', start: -586, end: -400, track: 'oldworld',
    blurb: 'Babylon, the return under Cyrus, and the close of the Hebrew canon with Malachi.' },
  { id: 9, label: 'Lehite Exodus & Founding', short: 'Lehites', start: -600, end: -200, track: 'newworld',
    blurb: 'Lehi\'s family leaves Jerusalem before its fall; Nephites and Lamanites diverge; the small-plates generations keep the record.' },
  { id: 10, label: 'Kings, Judges & Wars', short: 'Judges (BoM)', start: -200, end: 33, track: 'newworld',
    blurb: 'Benjamin and Mosiah, the reign of the judges, Alma\'s ministry, the Amalickiahite wars, and the Gadianton secret combinations.' },
  { id: 11, label: 'New Testament', short: 'NT', start: -4, end: 100, track: 'oldworld',
    blurb: 'The life of Jesus Christ, the Twelve, and the apostolic church from Jerusalem to Rome.' },
  { id: 12, label: 'Christ in America & Nephite Twilight', short: 'Zion → Cumorah', start: 33, end: 421, track: 'newworld',
    blurb: 'The risen Christ ministers at Bountiful; two centuries of peace dissolve into the final destruction witnessed by Mormon and Moroni.' },
];

export const ERA_BY_ID: Record<number, EraDef> = Object.fromEntries(ERAS.map((e) => [e.id, e]));
