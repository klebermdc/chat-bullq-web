'use client';

import { useState } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
import { AlertTriangle, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LoadingState } from '@/components/ui/empty-state';
import { formatRate } from '../lib/format';
import type { PricingConfig } from '../services/whatsapp-costs.service';
import { EditRatesDialog } from './edit-rates-dialog';
import { RATE_CATEGORIES } from './rate-categories';
import { SectionCard, SectionError } from './section-parts';

const TITLE = 'Tarifas usadas na estimativa';

function RatesBody({ pricing }: { pricing: PricingConfig }) {
  const hasAnyRate = RATE_CATEGORIES.some((c) => (pricing.rates[c.key] ?? 0) > 0);

  return (
    <>
      {!hasAnyRate && (
        <p
          role="status"
          className="mb-4 flex items-start gap-2 rounded-lg bg-warning-wash px-3 py-2 text-sm text-warning-ink"
        >
          <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
          <span>As tarifas estão zeradas: o custo estimado fica em zero até você preencher os valores.</span>
        </p>
      )}
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 lg:grid-cols-4">
        {RATE_CATEGORIES.map((category) => (
          <div key={category.key} className="min-w-0">
            <dt className="truncate text-xs text-muted-foreground">{category.label}</dt>
            <dd className="mt-0.5 font-mono text-sm tabular-nums text-foreground">
              {formatRate(pricing.rates[category.key] ?? 0, pricing.currency)}
            </dd>
          </div>
        ))}
      </dl>
    </>
  );
}

/** Tarifa por mensagem de cada categoria, com edição. Carrega e falha sozinha. */
export function RatesCard({ query }: { query: UseQueryResult<PricingConfig> }) {
  const [isEditing, setIsEditing] = useState(false);
  const pricing = query.data;

  return (
    <SectionCard
      title={TITLE}
      subtitle={pricing ? `Valor por mensagem, em ${pricing.currency}` : 'Valor por mensagem'}
      actions={
        pricing && (
          <Button variant="outline" size="sm" className="h-9 sm:h-8" onClick={() => setIsEditing(true)}>
            <Pencil aria-hidden="true" className="h-3.5 w-3.5" />
            Editar tarifas
          </Button>
        )
      }
    >
      {query.isPending && <LoadingState label="Carregando tarifas…" className="py-6" />}
      {query.isError && (
        <SectionError
          title="Não foi possível carregar as tarifas"
          error={query.error}
          onRetry={() => void query.refetch()}
          isRetrying={query.isFetching}
        />
      )}
      {pricing && <RatesBody pricing={pricing} />}
      {pricing && isEditing && <EditRatesDialog pricing={pricing} onClose={() => setIsEditing(false)} />}
    </SectionCard>
  );
}
