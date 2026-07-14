import type { CardSummary } from '../services/pipelines.service';

export interface PipelineFilter {
  vendorId: string | null; // conversation.assignedTo.id ?? assignedTo.id
  entryMonth: string | null; // 'YYYY-MM' sobre createdAt
  travelMonth: string | null; // 'YYYY-MM' sobre travelStartDate
  stageId: string | null;
  status: '' | 'OPEN' | 'WON' | 'LOST';
  minValue: number | null;
  maxValue: number | null;
  search: string; // sobre contact.name / title
}

export const EMPTY_FILTER: PipelineFilter = {
  vendorId: null,
  entryMonth: null,
  travelMonth: null,
  stageId: null,
  status: '',
  minValue: null,
  maxValue: null,
  search: '',
};

export function cardVendorId(c: CardSummary): string | null {
  return c.conversation?.assignedTo?.id ?? c.assignedTo?.id ?? null;
}

export function cardVendorName(c: CardSummary): string | null {
  return c.conversation?.assignedTo?.name ?? c.assignedTo?.name ?? null;
}

function monthOf(iso: string | null | undefined): string | null {
  if (!iso) return null;
  return iso.slice(0, 7); // ISO começa com 'YYYY-MM'
}

function numValue(v: string | number | null): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'string' ? parseFloat(v) : v;
  return Number.isFinite(n) ? (n as number) : null;
}

export function applyFilters(
  cards: CardSummary[],
  f: PipelineFilter,
): CardSummary[] {
  const q = f.search.trim().toLowerCase();
  return cards.filter((c) => {
    if (f.vendorId && cardVendorId(c) !== f.vendorId) return false;
    if (f.entryMonth && monthOf(c.createdAt) !== f.entryMonth) return false;
    if (f.travelMonth && monthOf(c.travelStartDate) !== f.travelMonth) return false;
    if (f.stageId && c.stageId !== f.stageId) return false;
    if (f.status && c.status !== f.status) return false;
    const val = numValue(c.value);
    if (f.minValue != null && (val == null || val < f.minValue)) return false;
    if (f.maxValue != null && (val == null || val > f.maxValue)) return false;
    if (q) {
      const hay = `${c.contact?.name ?? ''} ${c.title ?? ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

const MONTHS_PT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

export function monthLabel(value: string): string {
  const [y, m] = value.split('-');
  return `${MONTHS_PT[parseInt(m, 10) - 1]}/${y}`;
}

export interface MonthOption {
  value: string;
  label: string;
}

export function deriveMonths(
  cards: CardSummary[],
  field: 'createdAt' | 'travelStartDate',
): MonthOption[] {
  const set = new Set<string>();
  for (const c of cards) {
    const mo = monthOf(field === 'createdAt' ? c.createdAt : c.travelStartDate);
    if (mo) set.add(mo);
  }
  return [...set]
    .sort()
    .reverse()
    .map((value) => ({ value, label: monthLabel(value) }));
}

export interface VendorOption {
  id: string;
  name: string;
}

export function deriveVendors(cards: CardSummary[]): VendorOption[] {
  const map = new Map<string, string>();
  for (const c of cards) {
    const id = cardVendorId(c);
    if (id && !map.has(id)) map.set(id, cardVendorName(c) ?? '—');
  }
  return [...map.entries()]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function isFilterActive(f: PipelineFilter): boolean {
  return !!(
    f.vendorId ||
    f.entryMonth ||
    f.travelMonth ||
    f.stageId ||
    f.status ||
    f.minValue != null ||
    f.maxValue != null ||
    f.search.trim()
  );
}
