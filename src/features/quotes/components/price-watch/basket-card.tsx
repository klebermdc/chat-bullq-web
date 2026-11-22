'use client';

import { useState, type FormEvent } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatChartDay } from '@/lib/chart-theme';
import { formatQuoteMoney, formatTimeHM } from '../../lib/quote-format';
import type { PriceWatchRun } from '../../types';

interface Props {
  basketLink: string | null;
  lastRun: PriceWatchRun | null;
  canManage: boolean;
  isBusy: boolean;
  onSave: (link: string | null) => void;
  onRunNow: () => void;
}

/** Cesta da coleta diária, quando foi a última coleta e o câmbio que os sites mostravam. */
export function BasketCard({ basketLink, lastRun, canManage, isBusy, onSave, onRunNow }: Props) {
  const [draft, setDraft] = useState(basketLink ?? '');
  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSave(draft.trim() || null);
  };
  return (
    <section className="space-y-2 rounded-md border border-border p-3 text-sm">
      <h2 className="font-medium">Cesta de ingressos</h2>
      <p className="text-xs text-muted-foreground">
        Todo dia às 05:00 o Sendtur lê esta cesta e guarda o preço de cada item em todas as lojas.
      </p>
      {basketLink ? (
        <a
          href={basketLink}
          target="_blank"
          rel="noopener noreferrer"
          className="block truncate text-xs text-primary underline-offset-2 hover:underline"
        >
          {basketLink}
        </a>
      ) : (
        <p className="text-xs text-muted-foreground">Nenhuma cesta cadastrada.</p>
      )}
      {lastRun && (
        <p className="text-xs">
          Última coleta: {formatChartDay(lastRun.day)} às {formatTimeHM(lastRun.checkedAt)}
          {lastRun.rates.length > 0 && (
            <span className="text-muted-foreground">
              {' · câmbio '}
              {lastRun.rates.map((r) => `${r.code} ${formatQuoteMoney(r.value, 'BRL')}`).join(' · ')}
            </span>
          )}
        </p>
      )}
      {canManage && (
        <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Link do carrinho da cesta (https://reservas.orlandofastpass.com.br/pt/checkout/...)"
            aria-label="Link do carrinho da cesta"
            disabled={isBusy}
          />
          <Button type="submit" variant="outline" disabled={isBusy} className="shrink-0">
            Salvar cesta
          </Button>
          <Button type="button" onClick={onRunNow} disabled={isBusy || !basketLink} className="shrink-0">
            {isBusy ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
            Coletar agora
          </Button>
        </form>
      )}
    </section>
  );
}
