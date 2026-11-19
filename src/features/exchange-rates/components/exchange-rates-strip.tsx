'use client';

import { ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useExchangeRates } from '../use-exchange-rates';
import { formatRate, rateTitle } from '../lib/format';

/**
 * Câmbio do dólar nas operadoras, no rodapé do menu. Clicar na sigla abre o
 * site da operadora. Some quando a org não usa o recurso.
 */
export function ExchangeRatesStrip() {
  const { data } = useExchangeRates();
  if (!data?.enabled || data.rates.length === 0) return null;

  return (
    <div className="px-2 pb-1">
      <p className="menu-muted text-[11px]/4 font-medium uppercase tracking-wide">Câmbio do dia</p>
      <ul className="mt-1 flex flex-wrap gap-1.5" aria-label="Câmbio do dólar nas operadoras">
        {data.rates.map((rate) => (
          <li key={rate.code}>
            <a
              href={rate.url}
              target="_blank"
              rel="noopener noreferrer"
              title={rateTitle(rate)}
              className={cn(
                'flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs/5 tabular-nums transition-colors hover:bg-[var(--menu-hover)]',
                rate.stale && 'opacity-60',
              )}
            >
              <span className="menu-muted font-medium">{rate.code}</span>
              {rate.value !== null ? (
                <span className="menu-strong font-semibold">{formatRate(rate.value)}</span>
              ) : (
                <ExternalLink aria-label="consultar no site" className="menu-muted size-3" />
              )}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
