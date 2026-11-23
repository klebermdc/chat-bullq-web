'use client';

import { useEffect, useState, type RefObject } from 'react';

export interface ElementSize {
  width: number;
  height: number;
  dpr: number;
}

/** Tamanho (em px de CSS) e densidade da tela, atualizados quando mudam. */
export function useElementSize(ref: RefObject<HTMLElement | null>): ElementSize {
  const [size, setSize] = useState<ElementSize>({ width: 0, height: 0, dpr: 1 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      const next = { width: Math.round(r.width), height: Math.round(r.height), dpr: window.devicePixelRatio || 1 };
      setSize((prev) =>
        prev.width === next.width && prev.height === next.height && prev.dpr === next.dpr ? prev : next,
      );
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [ref]);
  return size;
}
