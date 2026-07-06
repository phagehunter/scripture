import type { ReactNode } from 'react';
import { useAtlas } from '../context/AtlasContext';
import { NAME_REGEX, resolveName } from '../data/nameRules';
import { PERSON_BY_ID } from '../data/people';
import type { Volume } from '../types';

/**
 * Verse text with live, CONTEXT-AWARE name links: "Nephi" in Helaman resolves
 * to Nephi₂, in 3 Nephi to Nephi₃; "Alma" in the book of Alma is the younger.
 * Hover spotlights the node in the network; click flies the camera to it.
 */
export default function LinkedVerse({ text, slug, volume }: { text: string; slug: string; volume: Volume }) {
  const { setHighlight } = useAtlas();
  const parts = text.split(NAME_REGEX);
  return (
    <>
      {parts.map((part, idx): ReactNode => {
        const id = resolveName(part, slug, volume);
        if (!id || !PERSON_BY_ID[id]) return part;
        const person = PERSON_BY_ID[id];
        return (
          <span
            key={idx}
            role="button"
            tabIndex={0}
            className="text-amber-300/95 border-b border-dotted border-amber-500/50 cursor-pointer rounded-sm hover:text-amber-200 hover:bg-amber-900/30 transition-colors"
            title={`${person.name} — ${person.disambiguator}`}
            onMouseEnter={() => setHighlight({ id, focus: false })}
            onMouseLeave={() => setHighlight(null)}
            onClick={() => setHighlight({ id, focus: true })}
            onKeyDown={(e) => e.key === 'Enter' && setHighlight({ id, focus: true })}
          >
            {part}
          </span>
        );
      })}
    </>
  );
}
