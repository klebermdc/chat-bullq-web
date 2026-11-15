'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { groupFields, type FieldSection } from '../lib/field-groups';
import { missingPlaceholders } from '../lib/placeholders';
import type { FieldOrigin, PlaceholderValues } from '../types';
import { PlaceholderField } from './placeholder-field';

interface PlaceholderFormProps {
  placeholders: readonly string[];
  values: PlaceholderValues;
  onChange: (placeholder: string, value: string) => void;
  /** Seções do formulário (Cliente, Venda…); sem elas, lista única. */
  sections?: readonly FieldSection[];
  /** Origem do valor de cada campo, para o selo. */
  origins?: Readonly<Record<string, FieldOrigin>>;
  /**
   * Destaca os campos vazios (depois de uma tentativa de enviar). Ao mudar de
   * valor, o foco vai para o primeiro campo vazio.
   */
  focusMissingSignal?: number;
  disabled?: boolean;
}

const CLIENT_HINT = 'CPF, RG, endereço e nascimento ficam salvos no contato para os próximos contratos.';
const sectionTitleCls = 'text-[11px] font-semibold uppercase tracking-wider text-muted-foreground';

/**
 * Seção recolhida (campos automáticos). Abre sozinha só se começar com campo
 * vazio; depois quem manda é o atendente, para não fechar enquanto digita.
 */
function CollapsedSection({ title, startOpen, children }: { title: string; startOpen: boolean; children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(startOpen);
  return (
    <details
      open={isOpen}
      onToggle={(e) => setIsOpen(e.currentTarget.open)}
      className="rounded-xl border border-border/70 px-3 py-2"
    >
      <summary className={cn(sectionTitleCls, 'cursor-pointer select-none py-1')}>{title}</summary>
      <div className="space-y-4 pt-3 pb-1">{children}</div>
    </details>
  );
}

/**
 * Formulário dos campos de um modelo: um campo por placeholder, todos
 * obrigatórios, agrupados por seção. Usado no contrato do cliente e no
 * documento interno.
 */
export function PlaceholderForm({
  placeholders,
  values,
  onChange,
  sections,
  origins = {},
  focusMissingSignal = 0,
  disabled,
}: PlaceholderFormProps) {
  const baseId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const missing = missingPlaceholders(placeholders, values);
  const missingSet = new Set(missing);
  const highlight = focusMissingSignal > 0;
  const visibleSections = sections ?? groupFields(placeholders, null);

  useEffect(() => {
    if (!focusMissingSignal) return;
    const firstEmpty = containerRef.current?.querySelector<HTMLElement>('[data-empty="true"]');
    firstEmpty?.closest('details')?.setAttribute('open', '');
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

  const renderFields = (fields: readonly string[]): ReactNode =>
    fields.map((placeholder) => {
      const isEmpty = missingSet.has(placeholder);
      return (
        <PlaceholderField
          key={placeholder}
          id={`${baseId}-${placeholders.indexOf(placeholder)}`}
          placeholder={placeholder}
          value={values[placeholder] ?? ''}
          isEmpty={isEmpty}
          isInvalid={highlight && isEmpty}
          origin={origins[placeholder]}
          disabled={disabled}
          onChange={onChange}
        />
      );
    });

  return (
    <div ref={containerRef} className="space-y-4">
      <p aria-live="polite" className={cn('text-xs', missing.length ? 'text-warning-ink' : 'text-success-ink')}>
        {missing.length === 0
          ? 'Todos os campos preenchidos.'
          : missing.length === 1
            ? '1 campo ainda vazio.'
            : `${missing.length} campos ainda vazios.`}
      </p>

      {visibleSections.map((section) => {
        if (!section.title) return <div key={section.id} className="space-y-4">{renderFields(section.fields)}</div>;
        if (section.id === 'auto') {
          return (
            <CollapsedSection
              key={section.id}
              title={`${section.title} (${section.fields.length})`}
              startOpen={section.fields.some((f) => missingSet.has(f))}
            >
              {renderFields(section.fields)}
            </CollapsedSection>
          );
        }
        return (
          <section key={section.id} aria-label={section.title} className="space-y-3">
            <div>
              <h3 className={sectionTitleCls}>{section.title}</h3>
              {section.id === 'client' && <p className="mt-0.5 text-xs text-muted-foreground">{CLIENT_HINT}</p>}
            </div>
            <div className="space-y-4">{renderFields(section.fields)}</div>
          </section>
        );
      })}
    </div>
  );
}
