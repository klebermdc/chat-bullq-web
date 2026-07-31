'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import type { BugFilters, ErrorIssueStatus, ErrorSeverity, ErrorSource } from '../services/bugs.service';

/**
 * Painel abre em OPEN, não em "todas as situações": um painel de bugs que
 * mostra problema já resolvido de cara é ruído — o superadmin quer ver o
 * que ainda está quebrado.
 */
export const DEFAULT_BUG_FILTERS: BugFilters = { status: 'OPEN', page: 1, perPage: 25 };

const SOURCE_OPTIONS: { value: ErrorSource; label: string }[] = [
  { value: 'API', label: 'API' },
  { value: 'CHANNEL', label: 'Canal' },
  { value: 'AI', label: 'IA' },
  { value: 'JOB', label: 'Job' },
];

const SEVERITY_OPTIONS: { value: ErrorSeverity; label: string }[] = [
  { value: 'CRITICAL', label: 'Crítico' },
  { value: 'ERROR', label: 'Erro' },
  { value: 'WARNING', label: 'Aviso' },
];

const STATUS_OPTIONS: { value: ErrorIssueStatus; label: string }[] = [
  { value: 'OPEN', label: 'Aberto' },
  { value: 'RESOLVED', label: 'Resolvido' },
  { value: 'MUTED', label: 'Silenciado' },
];

// Mesma classe usada nos demais filter bars do projeto (leads/deals/conversations/pipeline),
// só com w-full sm:w-auto extra para empilhar em telas estreitas.
const selectCls =
  'w-full rounded-md border border-zinc-300 bg-white px-2 py-2 text-sm text-zinc-700 ' +
  'focus:border-primary focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 sm:w-auto';

function isDefaultFilters(f: BugFilters): boolean {
  return (
    f.source === undefined &&
    f.severity === undefined &&
    f.status === 'OPEN' &&
    !f.q &&
    (f.page ?? 1) === 1 &&
    (f.perPage ?? 25) === 25
  );
}

interface BugFiltersProps {
  filters: BugFilters;
  onChange: (filters: BugFilters) => void;
}

export function BugFilterBar({ filters, onChange }: BugFiltersProps) {
  // Só o texto digitado vive localmente — o resto do estado é 100% do pai.
  const [search, setSearch] = useState(filters.q ?? '');

  // Se o pai resetar os filtros por fora (ex: botão Limpar, ou navegação),
  // o campo de busca precisa refletir isso.
  useEffect(() => {
    setSearch(filters.q ?? '');
  }, [filters.q]);

  // Debounce de 300ms: sem isso cada tecla dispara uma request.
  useEffect(() => {
    const trimmed = search.trim();
    if (trimmed === (filters.q ?? '')) return;
    const timer = setTimeout(() => {
      onChange({ ...filters, q: trimmed || undefined, page: 1 });
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  // Qualquer troca de filtro volta pra página 1 — senão o usuário fica
  // preso na página 4 de um resultado que agora só tem 1 página.
  const set = (patch: Partial<BugFilters>) => onChange({ ...filters, ...patch, page: 1 });

  const clear = () => {
    setSearch('');
    onChange({ ...DEFAULT_BUG_FILTERS });
  };

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900 sm:flex-row sm:flex-wrap sm:items-center">
      <select
        aria-label="Filtrar por fonte"
        className={selectCls}
        value={filters.source ?? ''}
        onChange={(e) => set({ source: (e.target.value || undefined) as ErrorSource | undefined })}
      >
        <option value="">Fonte: todas</option>
        {SOURCE_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>

      <select
        aria-label="Filtrar por severidade"
        className={selectCls}
        value={filters.severity ?? ''}
        onChange={(e) => set({ severity: (e.target.value || undefined) as ErrorSeverity | undefined })}
      >
        <option value="">Severidade: todas</option>
        {SEVERITY_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>

      <select
        aria-label="Filtrar por situação"
        className={selectCls}
        value={filters.status ?? ''}
        onChange={(e) => set({ status: (e.target.value || undefined) as ErrorIssueStatus | undefined })}
      >
        <option value="">Situação: todas</option>
        {STATUS_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>

      <input
        type="search"
        placeholder="Buscar por título ou código"
        aria-label="Buscar por título ou código"
        className={`${selectCls} sm:min-w-[14rem] sm:flex-1`}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {!isDefaultFilters(filters) && (
        <button
          type="button"
          onClick={clear}
          className="inline-flex w-full items-center justify-center gap-1 rounded-md border border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 sm:w-auto"
        >
          <X className="h-3.5 w-3.5" /> Limpar
        </button>
      )}
    </div>
  );
}
