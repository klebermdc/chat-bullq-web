'use client';

import { useCallback, useEffect, useState, type RefObject } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// Uma coluna (w-72 = 288px) + o gap-3 (12px) entre elas.
const COLUMN_STEP_PX = 300;
// Folga para arredondamento de subpixel no fim da rolagem.
const EDGE_TOLERANCE_PX = 2;

interface Props {
  scrollRef: RefObject<HTMLDivElement | null>;
  /** Muda quando as colunas mudam (troca de funil, etapa nova) para recalcular. */
  contentKey: string;
}

/**
 * Setas ‹ › nas bordas do kanban. Existem porque no macOS com trackpad a
 * barra horizontal pode não aparecer, e sem ela não há pista de que o quadro
 * continua para o lado.
 */
export function BoardScrollButtons({ scrollRef, contentKey }: Props) {
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const update = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > EDGE_TOLERANCE_PX);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - EDGE_TOLERANCE_PX);
  }, [scrollRef]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    update();
    el.addEventListener('scroll', update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => {
      el.removeEventListener('scroll', update);
      observer.disconnect();
    };
  }, [scrollRef, update, contentKey]);

  const scrollBy = (direction: 1 | -1) => {
    scrollRef.current?.scrollBy({ left: direction * COLUMN_STEP_PX, behavior: 'smooth' });
  };

  const buttonCls =
    'absolute top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-zinc-200 bg-white/90 text-zinc-700 shadow-md backdrop-blur transition hover:bg-white hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:border-zinc-700 dark:bg-zinc-900/90 dark:text-zinc-200 dark:hover:bg-zinc-800';

  return (
    <>
      {canLeft && (
        <button
          type="button"
          onClick={() => scrollBy(-1)}
          aria-label="Ver colunas anteriores"
          className={`${buttonCls} left-2`}
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
      )}
      {canRight && (
        <button
          type="button"
          onClick={() => scrollBy(1)}
          aria-label="Ver próximas colunas"
          className={`${buttonCls} right-2`}
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      )}
    </>
  );
}
