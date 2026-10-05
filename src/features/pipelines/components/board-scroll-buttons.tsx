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
 * Setas ‹ › do kanban, na linha dos filtros (fora da área que rola, para não
 * cobrir os cards). Existem porque no macOS com trackpad a barra horizontal
 * pode não aparecer, e sem ela não há pista de que o quadro continua para o
 * lado. Somem quando todas as colunas cabem na tela.
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

  // Nada para rolar: as setas só fariam ruído.
  if (!canLeft && !canRight) return null;

  // `aria-disabled` em vez de `disabled`: ao chegar na ponta o botão segue
  // focável, senão o foco do teclado se perderia no meio da rolagem.
  const buttonCls =
    'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-input text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-disabled:cursor-not-allowed aria-disabled:opacity-40 aria-disabled:hover:bg-transparent aria-disabled:hover:text-muted-foreground';

  return (
    <div role="group" aria-label="Rolar colunas do quadro" className="flex shrink-0 items-center gap-1">
      <button
        type="button"
        onClick={() => canLeft && scrollBy(-1)}
        aria-disabled={!canLeft}
        aria-label="Ver colunas anteriores"
        title="Ver colunas anteriores"
        className={buttonCls}
      >
        <ChevronLeft aria-hidden="true" className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => canRight && scrollBy(1)}
        aria-disabled={!canRight}
        aria-label="Ver próximas colunas"
        title="Ver próximas colunas"
        className={buttonCls}
      >
        <ChevronRight aria-hidden="true" className="h-4 w-4" />
      </button>
    </div>
  );
}
