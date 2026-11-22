'use client';

import { useState } from 'react';
import { Loader2, Swords } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { COMPETITOR_ERROR_MESSAGE, buildCompetitorRequest, competitorRequestKey } from '../../lib/competitor-compare';
import type { QuoteDraft } from '../../lib/quote-draft';
import { competitorsService } from '../../services/competitors.service';
import type { CompetitorComparison } from '../../types';
import { QuoteCompetitorResults } from './quote-competitor-results';

interface CompareState {
  isLoading: boolean;
  error: string | null;
  /** Última comparação e a chave do pedido que a gerou. */
  last: { result: CompetitorComparison; key: string } | null;
}

const INITIAL: CompareState = { isLoading: false, error: null, last: null };

interface Props {
  draft: Pick<QuoteDraft, 'items'>;
  currency: string;
  disabled: boolean;
}

/**
 * "Comparar com a concorrência" — só o atendente vê. A API consulta o preço
 * de cada item nas lojas concorrentes; nada disso vai para a página do cliente.
 */
export function QuoteCompetitorCompare({ draft, currency, disabled }: Props) {
  const [state, setState] = useState<CompareState>(INITIAL);
  const request = buildCompetitorRequest(draft);
  const currentKey = competitorRequestKey(request);
  const hasItems = request.items.length > 0;
  const isStale = state.last !== null && state.last.key !== currentKey;

  const compare = async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const result = await competitorsService.compare(request);
      setState({ isLoading: false, error: null, last: { result, key: currentKey } });
    } catch {
      // O motivo técnico não ajuda o atendente; a última comparação continua na tela.
      setState((prev) => ({ ...prev, isLoading: false, error: COMPETITOR_ERROR_MESSAGE }));
    }
  };

  return (
    <section aria-labelledby="quote-competitor-compare-title" className="space-y-2.5 rounded-lg border border-border bg-card px-3 py-3">
      <div>
        <h4 id="quote-competitor-compare-title" className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <Swords aria-hidden="true" className="h-4 w-4 shrink-0" />
          Comparar com a concorrência
        </h4>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Consulta o preço de cada item nas lojas concorrentes, para a mesma data e as mesmas pessoas. O cliente não vê isto.
        </p>
      </div>

      <Button
        type="button"
        variant="outline"
        disabled={disabled || !hasItems || state.isLoading}
        onClick={compare}
        className="min-h-10 w-full"
      >
        {state.isLoading ? (
          <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
        ) : (
          <Swords aria-hidden="true" className="h-4 w-4" />
        )}
        {state.isLoading ? 'Consultando as lojas…' : 'Comparar com a concorrência'}
      </Button>

      {state.error && (
        <p role="alert" className="rounded-md bg-warning-wash px-2.5 py-2 text-xs text-warning-ink">
          {state.error}
        </p>
      )}

      {state.last && <QuoteCompetitorResults result={state.last.result} currency={currency} isStale={isStale} />}
    </section>
  );
}
