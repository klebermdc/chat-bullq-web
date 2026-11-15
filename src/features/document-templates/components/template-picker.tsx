'use client';

import { useMemo, useState } from 'react';
import { Check, FileText, Search } from 'lucide-react';
import { controlCls } from '@/components/ui/control';
import { EmptyState, LoadingState } from '@/components/ui/empty-state';
import { cn } from '@/lib/utils';
import { filterTemplates, groupByCategory } from '../lib/template-catalog';
import type { DocumentTemplateSummary } from '../types';

interface TemplatePickerProps {
  templates: readonly DocumentTemplateSummary[];
  isLoading: boolean;
  isError: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

/** Escolha do modelo: busca por título/categoria e lista agrupada por categoria. */
export function TemplatePicker({ templates, isLoading, isError, selectedId, onSelect }: TemplatePickerProps) {
  const [query, setQuery] = useState('');
  const groups = useMemo(() => groupByCategory(filterTemplates(templates, query)), [templates, query]);

  if (isLoading) return <LoadingState label="Carregando modelos…" />;
  if (isError) {
    return <p role="alert" className="py-6 text-center text-sm text-foreground">Não foi possível carregar os modelos.</p>;
  }
  if (templates.length === 0) {
    return (
      <EmptyState
        size="sm"
        icon={FileText}
        title="Nenhum modelo de contrato ativo"
        description="Peça ao dono ou administrador para cadastrar em Configurações › Modelos de documentos."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar modelo ou categoria"
          aria-label="Buscar modelo"
          className={cn(controlCls, 'w-full pl-9')}
        />
      </div>

      {groups.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Nenhum modelo encontrado para “{query}”.</p>
      ) : (
        <div role="radiogroup" aria-label="Modelos de contrato" className="space-y-4">
          {groups.map((group) => (
            <section key={group.category} aria-label={group.category}>
              <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {group.category}
              </h3>
              <ul className="space-y-1">
                {group.templates.map((t) => {
                  const isSelected = t.id === selectedId;
                  return (
                    <li key={t.id}>
                      <button
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        onClick={() => onSelect(t.id)}
                        className={cn(
                          'flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                          isSelected ? 'border-primary bg-primary/10 text-foreground' : 'border-border hover:bg-muted',
                        )}
                      >
                        <span className="min-w-0">
                          <span className="block truncate font-medium">{t.title}</span>
                          <span className="block text-xs text-muted-foreground">
                            {t.placeholders.length === 1 ? '1 campo' : `${t.placeholders.length} campos`}
                          </span>
                        </span>
                        {isSelected && <Check aria-hidden="true" className="h-4 w-4 shrink-0 text-primary" />}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
