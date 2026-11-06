import { ImagePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Proposal } from '@/features/proposals/types';
import { formatQuoteNumber } from '../lib/quote-format';

interface Props {
  quote: Proposal;
  disabled?: boolean;
  /** Liga/desliga o modo "atualizar com print" (os prints abaixo viram a atualização). */
  isPrintUpdate: boolean;
  onTogglePrintUpdate: (on: boolean) => void;
}

/**
 * No modal "Enviar cotação" (avião): a conversa já tem cotação enviada, então
 * oferece atualizar essa mesma com um print novo em vez de mandar outra.
 */
export function QuoteUpdateOffer({ quote, disabled, isPrintUpdate, onTogglePrintUpdate }: Props) {
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
          Para mudar o que já foi enviado, atualize com um print novo: o link continua o mesmo.
        </span>
      </p>
      <Button type="button" size="sm" onClick={() => onTogglePrintUpdate(true)} disabled={disabled}>
        <ImagePlus aria-hidden="true" className="h-4 w-4" />
        Atualizar com print
      </Button>
    </div>
  );
}
