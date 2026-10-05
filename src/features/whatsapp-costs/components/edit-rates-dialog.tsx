'use client';

import { useId, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { controlCls } from '@/components/ui/control';
import { Dialog } from '@/components/ui/dialog';
import { getErrorMessage } from '@/lib/errors';
import { cn } from '@/lib/utils';
import { useSavePricing } from '../hooks/use-whatsapp-costs';
import { parseRateInput } from '../lib/format';
import type { PricingConfig } from '../services/whatsapp-costs.service';
import { RATE_CATEGORIES, type RateCategory } from './rate-categories';

const COMMON_CURRENCIES = ['BRL', 'USD'];
const INVALID_RATE_MESSAGE = 'Use só números, com vírgula. Ex.: 0,0625';

type Draft = Record<RateCategory, string>;

const toInputText = (rate: number | undefined) => (rate ? String(rate).replace('.', ',') : '');

function draftFrom(rates: Record<string, number>): Draft {
  return Object.fromEntries(RATE_CATEGORIES.map((c) => [c.key, toInputText(rates[c.key])])) as Draft;
}

/** Edita a moeda e a tarifa por mensagem de cada categoria (`PUT /channel-usage/pricing`). */
export function EditRatesDialog({ pricing, onClose }: { pricing: PricingConfig; onClose: () => void }) {
  const formId = useId();
  const [currency, setCurrency] = useState(pricing.currency);
  const [draft, setDraft] = useState<Draft>(() => draftFrom(pricing.rates));
  const [isDirty, setIsDirty] = useState(false);
  const [hasTriedToSave, setHasTriedToSave] = useState(false);
  const savePricing = useSavePricing();

  const currencyOptions = COMMON_CURRENCIES.includes(pricing.currency)
    ? COMMON_CURRENCIES
    : [...COMMON_CURRENCIES, pricing.currency];

  const parsed = RATE_CATEGORIES.map((c) => ({ key: c.key, value: parseRateInput(draft[c.key]) }));
  const isInvalid = (key: RateCategory) =>
    hasTriedToSave && parsed.find((p) => p.key === key)?.value === null;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setHasTriedToSave(true);
    if (parsed.some((p) => p.value === null)) return;

    // Mantém tarifas de categorias que esta tela não edita.
    const rates = { ...pricing.rates, ...Object.fromEntries(parsed.map((p) => [p.key, p.value ?? 0])) };
    savePricing.mutate(
      { currency, rates },
      {
        onSuccess: () => {
          toast.success('Tarifas salvas');
          onClose();
        },
        onError: (error) => toast.error(getErrorMessage(error, 'Erro ao salvar tarifas')),
      },
    );
  };

  return (
    <Dialog
      open
      onClose={onClose}
      dismissible={!isDirty}
      title="Editar tarifas"
      description="Informe o valor por mensagem na moeda da sua fatura da Meta. Pela documentação, atendimento custa o mesmo que utilidade."
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={savePricing.isPending}>
            Cancelar
          </Button>
          <Button type="submit" form={formId} loading={savePricing.isPending}>
            Salvar
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={handleSubmit} noValidate className="space-y-4">
        <label className="flex items-center justify-between gap-3 text-sm text-foreground">
          Moeda da fatura
          <select
            value={currency}
            onChange={(event) => {
              setCurrency(event.target.value);
              setIsDirty(true);
            }}
            className={cn(controlCls, 'w-32')}
          >
            {currencyOptions.map((code) => (
              <option key={code} value={code}>{code}</option>
            ))}
          </select>
        </label>

        <fieldset className="space-y-3">
          <legend className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Valor por mensagem
          </legend>
          {RATE_CATEGORIES.map((category) => {
            const errorId = `${formId}-${category.key}-error`;
            const invalid = isInvalid(category.key);
            return (
              <div key={category.key}>
                <label className="flex items-center justify-between gap-3 text-sm text-foreground">
                  {category.label}
                  <input
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    placeholder="0,00"
                    value={draft[category.key]}
                    aria-invalid={invalid || undefined}
                    aria-describedby={invalid ? errorId : undefined}
                    onChange={(event) => {
                      setDraft((current) => ({ ...current, [category.key]: event.target.value }));
                      setIsDirty(true);
                    }}
                    className={cn(controlCls, 'w-32 text-right font-mono tabular-nums', invalid && 'border-urgent')}
                  />
                </label>
                {invalid && (
                  <p id={errorId} role="alert" className="mt-1 text-right text-xs text-urgent-ink">
                    {INVALID_RATE_MESSAGE}
                  </p>
                )}
              </div>
            );
          })}
        </fieldset>
      </form>
    </Dialog>
  );
}
