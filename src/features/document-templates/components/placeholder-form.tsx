'use client';

import { useEffect, useId, useRef } from 'react';
import { controlCls } from '@/components/ui/control';
import { cn } from '@/lib/utils';
import { isLongPlaceholder, missingPlaceholders, placeholderLabel } from '../lib/placeholders';
import type { PlaceholderValues } from '../types';

interface PlaceholderFormProps {
  placeholders: readonly string[];
  values: PlaceholderValues;
  onChange: (placeholder: string, value: string) => void;
  /**
   * Destaca os campos vazios (depois de uma tentativa de enviar). Ao mudar de
   * valor, o foco vai para o primeiro campo vazio.
   */
  focusMissingSignal?: number;
  disabled?: boolean;
}

const textareaCls = controlCls.replace('h-9', 'min-h-[5.5rem] py-2') + ' resize-y leading-relaxed';
const LONG_FIELD_ROWS = 4;

/**
 * Formulário dos campos de um modelo: um campo por placeholder, todos
 * obrigatórios. Usado no contrato do cliente e no documento interno.
 */
export function PlaceholderForm({ placeholders, values, onChange, focusMissingSignal = 0, disabled }: PlaceholderFormProps) {
  const baseId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const missing = missingPlaceholders(placeholders, values);
  const missingSet = new Set(missing);
  const highlight = focusMissingSignal > 0;

  useEffect(() => {
    if (!focusMissingSignal) return;
    const firstEmpty = containerRef.current?.querySelector<HTMLElement>('[data-empty="true"]');
    firstEmpty?.focus();
    firstEmpty?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [focusMissingSignal]);

  if (placeholders.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
        Este modelo não tem campos para preencher.
      </p>
    );
  }

  return (
    <div ref={containerRef} className="space-y-4">
      <p aria-live="polite" className={cn('text-xs', missing.length ? 'text-warning-ink' : 'text-success-ink')}>
        {missing.length === 0
          ? 'Todos os campos preenchidos.'
          : missing.length === 1
            ? '1 campo ainda vazio.'
            : `${missing.length} campos ainda vazios.`}
      </p>

      {placeholders.map((placeholder, index) => {
        const id = `${baseId}-${index}`;
        const isEmpty = missingSet.has(placeholder);
        const isInvalid = highlight && isEmpty;
        const common = {
          id,
          value: values[placeholder] ?? '',
          disabled,
          required: true,
          'aria-required': true,
          'aria-invalid': isInvalid || undefined,
          'data-empty': isEmpty ? 'true' : undefined,
          className: cn(
            'w-full',
            isInvalid && 'border-warning-ink/60 focus-visible:border-warning-ink focus-visible:ring-warning-ink/25',
          ),
        };
        return (
          <div key={placeholder} className="space-y-1.5">
            <label htmlFor={id} className="flex items-center justify-between gap-2 text-sm font-medium text-foreground">
              <span>
                {placeholderLabel(placeholder)}
                <span aria-hidden="true" className="ml-0.5 text-muted-foreground">*</span>
              </span>
              {isEmpty && <span className="text-[11px] font-normal text-muted-foreground">vazio</span>}
            </label>
            {isLongPlaceholder(placeholder) ? (
              <textarea
                {...common}
                rows={LONG_FIELD_ROWS}
                onChange={(e) => onChange(placeholder, e.target.value)}
                className={cn(textareaCls, common.className)}
              />
            ) : (
              <input
                {...common}
                type="text"
                onChange={(e) => onChange(placeholder, e.target.value)}
                className={cn(controlCls, common.className)}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
