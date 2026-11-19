'use client';

import { cn } from '@/lib/utils';
import { useExchangeRates } from '../use-exchange-rates';
import { formatRate, rateTitle } from '../lib/format';
import { CARD_CLS, ManualRateCard } from './manual-rate-card';

/**
 * Câmbio do dólar nas operadoras, na tela de abertura do Inbox. Clicar numa
 * operadora automática abre o site dela; a AZ é lançada à mão pelo ADM.
 * Some quando a org não usa o recurso.
 */
export function ExchangeRatesCard() {
  const { data } = useExchangeRates();
  if (!data?.enabled || data.rates.length === 0) return null;

  return (
    <section aria-labelledby="cambio-do-dia" className="mt-10 w-full max-w-md">
      <h3
        id="cambio-do-dia"
        className="text-center text-xs font-medium uppercase tracking-wide text-muted-foreground"
      >
        Câmbio do dia · US$ 1
      </h3>
      <ul className="mt-3 grid grid-cols-3 gap-3">
        {data.rates.map((rate) => (
          <li key={rate.code}>
            {rate.manual ? (
              <ManualRateCard rate={rate} />
            ) : (
              <a
                href={rate.url}
                target="_blank"
                rel="noopener noreferrer"
                title={rateTitle(rate)}
                className={cn(
                  CARD_CLS,
                  'transition-colors hover:border-primary/40 hover:bg-accent',
                  rate.stale && 'opacity-60',
                )}
              >
                <span className="text-xs font-semibold text-muted-foreground">{rate.code}</span>
                <span className="mt-1 text-xl font-semibold tabular-nums text-foreground">
                  {rate.value !== null ? `R$ ${formatRate(rate.value)}` : '—'}
                </span>
                <span className="mt-0.5 truncate text-[11px] text-muted-foreground">{rate.name}</span>
              </a>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
