import type { AudienceFilter } from '@/lib/email-api';

/**
 * Forma "de formulário" do `AudienceFilter` — tudo texto, porque é o que
 * `<input>` produz. `toAudienceFilterPayload` converte isso no filtro
 * tipado que a API espera; `filterFormStateFromFilter` faz o caminho
 * inverso, para reabrir uma campanha já salva com os campos preenchidos.
 */
export interface AudienceFilterFormState {
  tagIds: string[];
  categories: string[];
  suppliers: string[];
  /** `'YYYY-MM-DD'` ou `''` — o formato de `<input type="date">`. */
  purchasedSince: string;
  purchasedUntil: string;
  minSpent: string;
  minOrders: string;
}

export function emptyFilterFormState(): AudienceFilterFormState {
  return {
    tagIds: [],
    categories: [],
    suppliers: [],
    purchasedSince: '',
    purchasedUntil: '',
    minSpent: '',
    minOrders: '',
  };
}

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** `'YYYY-MM-DD'` → início do dia em UTC, em ISO. `undefined` se não for uma data válida. */
function startOfDayIso(value: string): string | undefined {
  if (!DATE_ONLY.test(value)) return undefined;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

/**
 * `'YYYY-MM-DD'` → FIM do dia em UTC, em ISO. Sem isso, filtrar "até
 * 30/06" excluiria uma compra feita à tarde do dia 30 — o filtro viraria
 * "até a meia-noite do dia 30", não "até o fim do dia 30".
 */
function endOfDayIso(value: string): string | undefined {
  if (!DATE_ONLY.test(value)) return undefined;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999));
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

/** `'2026-01-01T00:00:00.000Z'` → `'2026-01-01'`. */
function dateOnly(iso: string | undefined): string {
  return iso ? iso.slice(0, 10) : '';
}

/** Número não negativo, ou `undefined` se o texto não representa um. A API recusa valor negativo. */
function parseNonNegativeNumber(text: string): number | undefined {
  if (!text.trim()) return undefined;
  const n = Number(text);
  if (Number.isNaN(n) || n < 0) return undefined;
  return n;
}

function normalizeSupplierList(suppliers: string[]): string[] {
  return suppliers
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length > 0);
}

/**
 * Converte o estado do formulário no `AudienceFilter` que a API espera.
 * Campos vazios ou inválidos somem do resultado — nunca viram chave com
 * valor vazio, porque a presença da chave já é o que ativa o critério no
 * `buildAudienceWhere` do backend.
 */
export function toAudienceFilterPayload(state: AudienceFilterFormState): AudienceFilter {
  const filter: AudienceFilter = {};

  if (state.tagIds.length > 0) filter.tagIds = state.tagIds;
  if (state.categories.length > 0) filter.categories = state.categories;

  const suppliers = normalizeSupplierList(state.suppliers);
  if (suppliers.length > 0) filter.suppliers = suppliers;

  const since = startOfDayIso(state.purchasedSince);
  if (since) filter.purchasedSince = since;

  const until = endOfDayIso(state.purchasedUntil);
  if (until) filter.purchasedUntil = until;

  const minSpent = parseNonNegativeNumber(state.minSpent);
  if (minSpent !== undefined) filter.minSpent = minSpent;

  const minOrders = parseNonNegativeNumber(state.minOrders);
  if (minOrders !== undefined) filter.minOrders = Math.trunc(minOrders);

  return filter;
}

/** Caminho inverso — reabre uma campanha salva com os campos do formulário preenchidos. */
export function filterFormStateFromFilter(
  filter: AudienceFilter | null | undefined,
): AudienceFilterFormState {
  const base = emptyFilterFormState();
  if (!filter) return base;
  return {
    tagIds: filter.tagIds ?? [],
    categories: filter.categories ?? [],
    suppliers: filter.suppliers ?? [],
    purchasedSince: dateOnly(filter.purchasedSince),
    purchasedUntil: dateOnly(filter.purchasedUntil),
    minSpent: filter.minSpent !== undefined ? String(filter.minSpent) : '',
    minOrders: filter.minOrders !== undefined ? String(filter.minOrders) : '',
  };
}

export function isAudienceFilterEmpty(filter: AudienceFilter): boolean {
  return Object.keys(filter).length === 0;
}

/** Compara dois filtros já normalizados por `toAudienceFilterPayload` — a ordem das listas não importa. */
export function audienceFiltersEqual(a: AudienceFilter, b: AudienceFilter): boolean {
  const normalize = (f: AudienceFilter) => {
    const entries = Object.entries(f).map(([key, value]) => [
      key,
      Array.isArray(value) ? [...value].sort() : value,
    ]);
    entries.sort(([keyA], [keyB]) => (keyA as string).localeCompare(keyB as string));
    return JSON.stringify(entries);
  };
  return normalize(a) === normalize(b);
}
