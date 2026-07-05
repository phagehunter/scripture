import { useEffect, useRef, useState } from 'react';

/** Dispatched (on window) after any programmatic layout change — e.g. the
 *  reading panel being dragged, reset, or collapsed — so size-dependent
 *  visualizations re-measure even where ResizeObserver is throttled. */
export const LAYOUT_EVENT = 'atlas:layout';

export function notifyLayoutChange() {
  window.dispatchEvent(new Event(LAYOUT_EVENT));
}

/** Observe an element's rendered size (for canvas/SVG visualizations).
 *  Triple-sourced: ResizeObserver + window resize + the app layout event. */
export function useElementSize<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () =>
      setSize((prev) => {
        const width = el.clientWidth;
        const height = el.clientHeight;
        return prev.width === width && prev.height === height ? prev : { width, height };
      });
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    window.addEventListener('resize', measure);
    window.addEventListener(LAYOUT_EVENT, measure);
    measure();
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
      window.removeEventListener(LAYOUT_EVENT, measure);
    };
  }, []);

  return { ref, ...size };
}
