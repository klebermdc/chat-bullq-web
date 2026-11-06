import type { ReactNode } from 'react';
import type { QuoteItemKind } from '../../lib/quote-groups';
import { plural } from '../../lib/quote-format';
import { BagIcon, BedIcon, TicketIcon } from './quote-icons';

const ICONS: Record<QuoteItemKind, ReactNode> = {
  tickets: <TicketIcon size={18} />,
  hotel: <BedIcon size={18} />,
  other: <BagIcon size={18} />,
};

interface Props {
  kind: QuoteItemKind;
  label: string;
  count: number;
}

/** Balão que abre cada grupo de itens: "Ingressos · 3 itens". */
export function QuoteGroupBalloon({ kind, label, count }: Props) {
  return (
    <h3 className={`qt-group ${kind}`}>
      {ICONS[kind]}
      <span>{label}</span>
      <span className="qt-group-count">{plural(count, 'item', 'itens')}</span>
    </h3>
  );
}
