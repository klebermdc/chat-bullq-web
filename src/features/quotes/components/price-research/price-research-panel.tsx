'use client';

import { useState, type FormEvent } from 'react';
import { Loader2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getErrorMessage } from '@/lib/errors';
import { extractStoreLink, STORE_LINK_ERROR } from '@/features/proposals/lib/store-link';
import { formatQuoteMoney } from '../../lib/quote-format';
import { competitorsService } from '../../services/competitors.service';
import type { PriceResearchResult } from '../../types';
import { QuoteCompetitorResults } from '../editor/quote-competitor-results';

const RESEARCH_ERROR = 'Não consegui pesquisar agora. Tente de novo em instantes.';
const CURRENCY = 'BRL';

interface ResearchState {
  isLoading: boolean;
  error: string | null;
  result: PriceResearchResult | null;
}

const INITIAL: ResearchState = { isLoading: false, error: null, result: null };

function CartSummary({ cart }: { cart: PriceResearchResult['cart'] }) {
  const parts = [
    cart.pixTotal !== null && `Pix ${formatQuoteMoney(cart.pixTotal, CURRENCY)}`,
    cart.installments && `${cart.installments.count}x de ${formatQuoteMoney(cart.installments.value, CURRENCY)}`,
  ].filter(Boolean);
  return (
    <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
      <p>
        <span className="font-medium">Carrinho OFP</span> · {formatQuoteMoney(cart.total, CURRENCY)}
        {parts.length > 0 && <span className="text-muted-foreground"> · {parts.join(' · ')}</span>}
      </p>
      {cart.comparedCount < cart.itemCount && (
        <p className="text-xs text-muted-foreground">
          Comparados os {cart.comparedCount} primeiros de {cart.itemCount} itens.
        </p>
      )}
    </div>
  );
}

/** Cola o link do carrinho da OFP e compara cada item com as lojas concorrentes. */
export function PriceResearchPanel() {
  const [text, setText] = useState('');
  const [state, setState] = useState<ResearchState>(INITIAL);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const link = extractStoreLink(text.trim());
    if (!link) {
      setState((prev) => ({ ...prev, error: STORE_LINK_ERROR }));
      return;
    }
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const result = await competitorsService.research(link);
      setState({ isLoading: false, error: null, result });
    } catch (err) {
      setState((prev) => ({ ...prev, isLoading: false, error: getErrorMessage(err, RESEARCH_ERROR) }));
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Cole o link do carrinho: https://reservas.orlandofastpass.com.br/pt/checkout/..."
          aria-label="Link do carrinho da OFP"
          disabled={state.isLoading}
        />
        <Button type="submit" disabled={state.isLoading || !text.trim()} className="shrink-0">
          {state.isLoading ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
          {state.isLoading ? 'Pesquisando…' : 'Pesquisar preços'}
        </Button>
      </form>
      {state.isLoading && (
        <p className="text-xs text-muted-foreground">Abrindo o carrinho e consultando as lojas. Leva uns 20 segundos.</p>
      )}
      {state.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
      {state.result && (
        <div className="space-y-3">
          <CartSummary cart={state.result.cart} />
          <QuoteCompetitorResults result={state.result.comparison} currency={CURRENCY} isStale={false} />
        </div>
      )}
    </div>
  );
}
