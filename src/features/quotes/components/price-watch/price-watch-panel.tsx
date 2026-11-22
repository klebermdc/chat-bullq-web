'use client';

import { useCallback, useEffect, useState } from 'react';
import { getErrorMessage } from '@/lib/errors';
import { competitorsService } from '../../services/competitors.service';
import type { PriceWatchTrends } from '../../types';
import { BasketCard } from './basket-card';
import { BeatersChart } from './beaters-chart';
import { PlatformsChart } from './platforms-chart';
import { TrendChart } from './trend-chart';

const PERIODS = [30, 90] as const;
const LOAD_ERROR = 'Não consegui carregar as tendências agora.';

/** Aba "Tendências" da Pesquisa de preço: coleta diária da cesta e os gráficos dela. */
export function PriceWatchPanel({ canManage }: { canManage: boolean }) {
  const [days, setDays] = useState<number>(PERIODS[0]);
  const [data, setData] = useState<PriceWatchTrends | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setData(await competitorsService.trends(days));
      setError(null);
    } catch (err) {
      setError(getErrorMessage(err, LOAD_ERROR));
    }
  }, [days]);

  useEffect(() => {
    void load();
  }, [load]);

  const act = async (action: () => Promise<unknown>) => {
    setIsBusy(true);
    try {
      await action();
      await load();
    } catch (err) {
      setError(getErrorMessage(err, LOAD_ERROR));
    } finally {
      setIsBusy(false);
    }
  };

  if (!data) return <p className="text-sm text-muted-foreground">{error ?? 'Carregando…'}</p>;
  const lastRun = data.runs[data.runs.length - 1] ?? null;
  return (
    <div className="space-y-3">
      <BasketCard
        key={data.basketLink ?? ''}
        basketLink={data.basketLink}
        lastRun={lastRun}
        canManage={canManage}
        isBusy={isBusy}
        onSave={(link) => void act(() => competitorsService.setBasket(link))}
        onRunNow={() => void act(() => competitorsService.runNow())}
      />
      {isBusy && (
        <p className="text-xs text-muted-foreground">Coletando todas as lojas da cesta. Leva uns 2 minutos.</p>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <div role="group" aria-label="Período" className="inline-flex rounded-lg bg-muted p-0.5">
        {PERIODS.map((p) => (
          <button
            key={p}
            type="button"
            aria-pressed={p === days}
            onClick={() => setDays(p)}
            className={
              p === days
                ? 'h-7 rounded-md bg-background px-2.5 text-xs font-medium shadow-soft'
                : 'h-7 rounded-md px-2.5 text-xs text-muted-foreground'
            }
          >
            {p} dias
          </button>
        ))}
      </div>
      {data.items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Ainda não há coleta no período. Depois da primeira (05:00 ou “Coletar agora”), aparecem aqui a tendência de
          cada item, quem mais nos bate e a comparação entre plataformas.
        </p>
      ) : (
        <>
          <TrendChart items={data.items} />
          <BeatersChart beaters={data.beaters} />
          <PlatformsChart platforms={data.platforms} />
        </>
      )}
    </div>
  );
}
