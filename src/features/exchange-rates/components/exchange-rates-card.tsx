'use client';

import { ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useExchangeRates } from '../use-exchange-rates';
import { formatRate, rateTitle } from '../lib/format';

/**
 * Câmbio do dólar nas operadoras, na tela de abertura do Inbox. Clicar na
 * operadora abre o site dela. Some quando a org não usa o recurso.
 */
export function ExchangeRatesCard() {
  const { data } = useExchangeRates();
  if (!data?.enabled || data.rates.length === 0) return null;

  return (
    <section aria-labelledby="cambio-do-dia" className="mt-10 w-full max-w-md">
      <h3 id="cambio-do-dia" className="text-center text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Câmbio do dia · US$ 1
      </h3>
      <ul className="mt-3 grid grid-cols-3 gap-3">
        {data.rates.map((rate) => (
          <li key={rate.code}>
            <a
              href={rate.url}
              target="_blank"
              rel="noopener noreferrer"
              title={rateTitle(rate)}
              className={cn(
                'flex h-full flex-col items-center rounded-xl border border-border bg-card px-3 py-3 text-center shadow-sm transition-colors hover:border-primary/40 hover:bg-accent',
                rate.stale && 'opacity-60',
              )}
            >
              <span className="text-xs font-semibold text-muted-foreground">{rate.code}</span>
              {rate.value !== null ? (
                <span className="mt-1 text-xl font-semibold tabular-nums text-foreground">
                  R$ {formatRate(rate.value)}
                </span>
              ) : (
                <span className="mt-1 flex items-center gap-1 text-sm font-medium text-primary">
                  ver no site <ExternalLink aria-hidden="true" className="size-3.5" />
                </span>
              )}
              <span className="mt-0.5 truncate text-[11px] text-muted-foreground">{rate.name}</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
