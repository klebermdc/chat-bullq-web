'use client';

import { useQuery } from '@tanstack/react-query';
import { Copy, ExternalLink, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { proposalsService } from '@/features/proposals/services/proposals.service';
import { describeQuoteTracking, latestQuote } from '../lib/quote-tracking';
import { copyQuoteLink } from './quote-sent-toast';

/** Atualiza o "aberta Nx" sozinho enquanto há cotação na conversa. */
const REFRESH_MS = 60_000;

const CARD_HEADER_LABEL = 'text-[11px] font-semibold uppercase tracking-wider text-muted-foreground';

/**
 * "Cliente abriu" — na gaveta do cliente, acima da última proposta: se a
 * cotação por link desta conversa já foi aberta, quantas vezes e se ainda vale.
 * Usa a mesma query do modal de proposta (mesma chave), então enviar uma
 * cotação já atualiza este cartão.
 */
export function QuoteTrackingCard({ conversationId }: { conversationId: string }) {
  const { data } = useQuery({
    queryKey: ['proposals', 'conversation', conversationId],
    queryFn: () => proposalsService.listForConversation(conversationId),
    enabled: !!conversationId,
    refetchInterval: (query) => (latestQuote(query.state.data) ? REFRESH_MS : false),
  });
  const quote = latestQuote(data);
  if (!quote) return null;
  const t = describeQuoteTracking(quote, new Date());
  const OpenedIcon = t.hasOpened ? Eye : EyeOff;

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-soft">
      <div className="flex items-center justify-between gap-2 border-b border-border/60 bg-muted/40 px-4 py-2.5">
        <span className={CARD_HEADER_LABEL}>Cotação por link</span>
        {t.expiry && (
          <span
            className={
              'shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ' +
              (t.isExpired ? 'bg-urgent-wash text-urgent-ink' : 'bg-muted text-muted-foreground')
            }
          >
            {t.expiry}
          </span>
        )}
      </div>
      <div className="space-y-3 p-4">
        <p className="flex items-center gap-1.5 text-sm text-foreground">
          <OpenedIcon aria-hidden="true" className={`h-4 w-4 shrink-0 ${t.hasOpened ? 'text-success-ink' : 'text-muted-foreground'}`} />
          <span>
            Cotação enviada · <span className={t.hasOpened ? 'font-medium' : 'text-muted-foreground'}>{t.opened}</span>
          </span>
        </p>
        {t.url && (
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => void copyQuoteLink(t.url!)} className="min-h-9">
              <Copy aria-hidden="true" className="h-3.5 w-3.5" />
              Copiar link
            </Button>
            <a
              href={t.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-9 items-center gap-1.5 rounded px-1 text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Ver página <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
