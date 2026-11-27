'use client';

import { ArrowDownNarrowWide, ArrowUpDown, ArrowUpNarrowWide } from 'lucide-react';
import { CARD_SORT_LABEL, nextCardSort, type CardSortOrder } from '../lib/card-sort';

interface Props {
  order: CardSortOrder;
  onChange: (order: CardSortOrder) => void;
}

const ICON = {
  manual: ArrowUpDown,
  newest: ArrowDownNarrowWide,
  oldest: ArrowUpNarrowWide,
} as const;

/** Setinha que ordena os cards de todas as colunas por data de entrada. */
export function CardSortButton({ order, onChange }: Props) {
  const Icon = ICON[order];
  const next = nextCardSort(order);
  return (
    <button
      type="button"
      onClick={() => onChange(next)}
      aria-label={`Ordenar cards: ${CARD_SORT_LABEL[next].toLowerCase()}`}
      title={`${CARD_SORT_LABEL[order]}. Clique para ${CARD_SORT_LABEL[next].toLowerCase()}.`}
      aria-pressed={order !== 'manual'}
      className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-input px-2.5 text-xs font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-pressed:border-primary aria-pressed:text-primary"
    >
      <Icon aria-hidden="true" className="h-3.5 w-3.5" />
      <span className="hidden lg:inline">{CARD_SORT_LABEL[order]}</span>
    </button>
  );
}
