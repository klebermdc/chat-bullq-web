'use client';

import Link from 'next/link';
import { Eye, EyeOff, ExternalLink, MessageCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Proposal } from '@/features/proposals/types';
import { previewFromSaved } from '../lib/quote-draft';
import { quoteRow, type QuoteRowSource } from '../lib/quote-list';

interface Props {
  quote: Proposal & QuoteRowSource;
  now: Date;
  onUpdate: (quote: Proposal) => void;
  /** Na página "Cotações": telefone, vendedor e o atalho para a conversa. */
  isFullRow?: boolean;
}

const LINK_CLS =
  'inline-flex min-h-9 items-center gap-1.5 rounded px-1 text-sm font-medium text-primary hover:underline ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

/** Uma cotação numa lista: o que foi cotado, se o cliente abriu, validade e ações. */
export function QuoteListRow({ quote, now, onUpdate, isFullRow = false }: Props) {
  const row = quoteRow(quote, now);
  const OpenedIcon = row.hasOpened ? Eye : EyeOff;
  const heading = isFullRow ? row.customer : (row.number ?? row.createdAt);
  return (
    <li className="space-y-2 rounded-xl border border-border bg-card p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="min-w-0 text-sm font-semibold text-foreground">
          {isFullRow && row.number && <span className="mr-2 text-primary">{row.number}</span>}
          {heading}
        </p>
        {row.total && <p className="text-sm font-semibold tabular-nums text-foreground">{row.total}</p>}
      </div>
      {row.products && <p className="break-words text-xs text-muted-foreground">{row.products}</p>}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span>criada {row.createdAt}</span>
        {row.updated && <span>{row.updated}</span>}
        <span className="inline-flex items-center gap-1">
          <OpenedIcon aria-hidden="true" className={`h-3.5 w-3.5 shrink-0 ${row.hasOpened ? 'text-success-ink' : ''}`} />
          {row.opened}
        </span>
        {row.expiry && (
          <span
            className={
              'rounded-full px-2 py-0.5 text-[11px] font-semibold ' +
              (row.isExpired ? 'bg-urgent-wash text-urgent-ink' : 'bg-muted text-muted-foreground')
            }
          >
            {row.expiry}
          </span>
        )}
        {isFullRow && row.phone && <span>{row.phone}</span>}
        {isFullRow && row.seller && <span>por {row.seller}</span>}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {previewFromSaved(quote.details) && (
          <Button type="button" variant="outline" size="sm" onClick={() => onUpdate(quote)} className="min-h-9">
            <RefreshCw aria-hidden="true" className="h-3.5 w-3.5" />
            Atualizar
          </Button>
        )}
        {isFullRow && (
          <Link href={`/inbox?conversationId=${quote.conversationId}`} className={LINK_CLS}>
            <MessageCircle aria-hidden="true" className="h-3.5 w-3.5" />
            Conversa
          </Link>
        )}
        {row.url && (
          <a href={row.url} target="_blank" rel="noreferrer" className={LINK_CLS}>
            Ver página <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
          </a>
        )}
      </div>
    </li>
  );
}
