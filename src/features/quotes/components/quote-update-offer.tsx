import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Proposal } from '@/features/proposals/types';
import { formatQuoteNumber } from '../lib/quote-format';

interface Props {
  quote: Proposal;
  disabled?: boolean;
  onUpdate: () => void;
}

/**
 * No modal "Enviar cotação" (avião): a conversa já tem cotação enviada, então
 * oferece reabrir essa mesma no editor em vez de mandar uma nova.
 */
export function QuoteUpdateOffer({ quote, disabled, onUpdate }: Props) {
  const label = quote.quoteNumber ? `a cotação nº ${formatQuoteNumber(quote.quoteNumber)}` : 'uma cotação';
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3">
      <p className="min-w-0 flex-1 text-sm text-foreground">
        Esta conversa já tem {label}.
        <span className="block text-xs text-muted-foreground">
          Para só mudar o que já foi enviado, atualize: o link continua o mesmo.
        </span>
      </p>
      <Button type="button" size="sm" onClick={onUpdate} disabled={disabled}>
        <RefreshCw aria-hidden="true" className="h-4 w-4" />
        Atualizar cotação
      </Button>
    </div>
  );
}
