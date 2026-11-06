import { ImagePlus, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Proposal } from '@/features/proposals/types';
import { formatQuoteNumber } from '../lib/quote-format';

interface Props {
  quote: Proposal;
  disabled?: boolean;
  onUpdate: () => void;
  /** Liga/desliga o modo "atualizar com print" (os prints abaixo viram a atualização). */
  isPrintUpdate: boolean;
  onTogglePrintUpdate: (on: boolean) => void;
}

/**
 * No modal "Enviar cotação" (avião): a conversa já tem cotação enviada, então
 * oferece reabrir essa mesma no editor em vez de mandar uma nova.
 */
export function QuoteUpdateOffer({ quote, disabled, onUpdate, isPrintUpdate, onTogglePrintUpdate }: Props) {
  const label = quote.quoteNumber ? `a cotação nº ${formatQuoteNumber(quote.quoteNumber)}` : 'uma cotação';
  if (isPrintUpdate) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3">
        <p className="min-w-0 flex-1 text-sm text-foreground">
          Atualizar {label} com print
          <span className="block text-xs text-muted-foreground">
            Cole (Ctrl+V), arraste ou anexe abaixo o print novo. Eu leio e abro a atualização com os itens dele; o link
            continua o mesmo.
          </span>
        </p>
        <Button type="button" size="sm" variant="outline" onClick={() => onTogglePrintUpdate(false)} disabled={disabled}>
          Voltar
        </Button>
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3">
      <p className="min-w-0 flex-1 text-sm text-foreground">
        Esta conversa já tem {label}.
        <span className="block text-xs text-muted-foreground">
          Para só mudar o que já foi enviado, atualize: o link continua o mesmo.
        </span>
      </p>
      <div className="flex flex-col gap-2">
        <Button type="button" size="sm" onClick={onUpdate} disabled={disabled}>
          <RefreshCw aria-hidden="true" className="h-4 w-4" />
          Atualizar cotação
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => onTogglePrintUpdate(true)} disabled={disabled}>
          <ImagePlus aria-hidden="true" className="h-4 w-4" />
          Atualizar com print
        </Button>
      </div>
    </div>
  );
}
