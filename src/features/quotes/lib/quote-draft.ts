import { parseMoneyBR } from '@/lib/money';
import type { QuoteData, QuoteHotel, QuoteInstallments, QuoteItem, QuotePreview } from '../types';

/**
 * Rascunho da cotação no editor do atendente. Números ficam como TEXTO
 * enquanto ele digita ("1.797,16"); só viram número na validação, que devolve
 * o payload exato do contrato ou a lista de problemas em pt-BR.
 * Toda operação devolve um rascunho novo — nada é mutado.
 */

export const MAX_QUOTE_ITEMS = 10;
/** Cartão: até 10x. O valor da parcela é sempre o total dividido, nunca digitado. */
export const MAX_QUOTE_INSTALLMENTS = 10;
export const QUOTE_LIMITS = {
  provider: 80,
  title: 200,
  description: 600,
  hotelSummary: 600,
  notes: 600,
  customerName: 60,
  people: 20,
} as const;
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const INTEGER = /^\d+$/;

export interface QuoteDraftItem {
  key: string;
  provider: string;
  title: string;
  startDate: string;
  endDate: string;
  description: string;
  adults: string;
  children: string;
  total: string;
  /**
   * Ingresso da base de regras escolhido pelo atendente: ausente = sugestão
   * automática, "" = nenhum. Fica só no editor, não vai para a cotação.
   */
  ruleId?: string;
  /** Nome do hotel no print e a ficha achada (o atendente pode editar o resumo ou tirar). */
  hotelName?: string | null;
  hotel?: QuoteHotel | null;
}

export interface QuoteDraft {
  customerName: string;
  items: QuoteDraftItem[];
  total: string;
  pixTotal: string;
  /** "" = não parcelar; senão "1".."10". */
  installmentsCount: string;
  notes: string;
}

export interface QuoteSubmission {
  quote: QuoteData;
  customerName: string | null;
}

export type QuoteDraftResult = { ok: true; value: QuoteSubmission } | { ok: false; errors: string[] };

const toCents = (n: number) => Math.round(n * 100);

/** 1797.16 → "1797,16" (vazio para null). */
export function toMoneyInput(value: number | null): string {
  return value === null ? '' : value.toFixed(2).replace('.', ',');
}

export function emptyDraftItem(key: string): QuoteDraftItem {
  return {
    key, provider: '', title: '', startDate: '', endDate: '', description: '',
    adults: '0', children: '0', total: '',
  };
}

function itemToDraft(item: QuoteItem, key: string): QuoteDraftItem {
  return {
    key,
    provider: item.provider,
    title: item.title,
    startDate: item.startDate ?? '',
    endDate: item.endDate ?? '',
    description: item.description ?? '',
    adults: String(item.adults),
    children: String(item.children),
    total: toMoneyInput(item.total),
    hotelName: item.hotelName ?? null,
    hotel: item.hotel ?? null,
  };
}

export function draftFromPreview(preview: QuotePreview, nextKey: () => string): QuoteDraft {
  const { quote } = preview;
  return {
    customerName: preview.customerName ?? '',
    items: quote.items.map((item) => itemToDraft(item, nextKey())),
    total: toMoneyInput(quote.total),
    pixTotal: toMoneyInput(quote.pixTotal),
    installmentsCount: String(Math.min(quote.installments?.count ?? MAX_QUOTE_INSTALLMENTS, MAX_QUOTE_INSTALLMENTS)),
    notes: quote.notes ?? '',
  };
}

/** 17971,62 em 10x → 1797,16 (arredondado no centavo). */
export function installmentValue(total: number, count: number): number {
  return Math.round(toCents(total) / count) / 100;
}

/** Parcelamento como vai ao cliente, ou null (sem parcelas ou total ilegível). */
export function draftInstallments(draft: Pick<QuoteDraft, 'total' | 'installmentsCount'>): QuoteInstallments | null {
  const count = Number(draft.installmentsCount);
  const total = parseMoneyBR(draft.total);
  if (!Number.isInteger(count) || count < 1 || count > MAX_QUOTE_INSTALLMENTS) return null;
  if (total === null || total <= 0) return null;
  return { count, value: installmentValue(total, count) };
}

/**
 * Junta a leitura de mais um print à cotação em conferência: os itens entram
 * no fim (até o máximo) e o total vira a soma dos itens. O Pix só soma quando
 * os dois lados têm; senão fica vazio para o atendente preencher — um Pix
 * parcial seria um preço errado na frente do cliente.
 */
export function appendPreviewToDraft(draft: QuoteDraft, preview: QuotePreview, nextKey: () => string): QuoteDraft {
  const room = MAX_QUOTE_ITEMS - draft.items.length;
  const added = preview.quote.items.slice(0, Math.max(0, room)).map((item) => itemToDraft(item, nextKey()));
  const items = [...draft.items, ...added];
  const currentPix = parseMoneyBR(draft.pixTotal);
  const extraPix = preview.quote.pixTotal;
  const pixTotal = currentPix !== null && currentPix > 0 && extraPix !== null ? toMoneyInput((toCents(currentPix) + toCents(extraPix)) / 100) : '';
  const next = { ...draft, items };
  return { ...next, total: toMoneyInput(sumDraftItems(next)), pixTotal };
}

export function updateDraftItem(draft: QuoteDraft, key: string, patch: Partial<Omit<QuoteDraftItem, 'key'>>): QuoteDraft {
  return { ...draft, items: draft.items.map((it) => (it.key === key ? { ...it, ...patch } : it)) };
}

export function addDraftItem(draft: QuoteDraft, nextKey: () => string): QuoteDraft {
  if (draft.items.length >= MAX_QUOTE_ITEMS) return draft;
  return { ...draft, items: [...draft.items, emptyDraftItem(nextKey())] };
}

/** O último item fica: cotação sem item não existe. */
export function removeDraftItem(draft: QuoteDraft, key: string): QuoteDraft {
  if (draft.items.length <= 1) return draft;
  return { ...draft, items: draft.items.filter((it) => it.key !== key) };
}

/** Soma dos totais legíveis — sugestão para o total da reserva. */
export function sumDraftItems(draft: QuoteDraft): number {
  const cents = draft.items.reduce((acc, it) => {
    const n = parseMoneyBR(it.total);
    return n !== null && n > 0 ? acc + toCents(n) : acc;
  }, 0);
  return cents / 100;
}

/* ── Validação ─────────────────────────────────────────────────────────── */

type Collector = (message: string) => void;

const blankToNull = (s: string) => (s.trim() ? s.trim() : null);

function readMoney(raw: string, required: boolean, onError: () => void): number | null {
  if (!raw.trim()) {
    if (required) onError();
    return null;
  }
  const n = parseMoneyBR(raw);
  if (n === null || n <= 0) {
    onError();
    return null;
  }
  return toCents(n) / 100;
}

function readPeople(raw: string, label: string, prefix: string, err: Collector): number {
  const value = raw.trim() === '' ? 0 : INTEGER.test(raw.trim()) ? Number(raw.trim()) : NaN;
  if (!(value >= 0 && value <= QUOTE_LIMITS.people)) {
    err(`${prefix}${label} vai de 0 a ${QUOTE_LIMITS.people}.`);
    return 0;
  }
  return value;
}

function checkLength(value: string, max: number, message: string, err: Collector) {
  if (value.trim().length > max) err(message);
}

function readDates(it: QuoteDraftItem, prefix: string, err: Collector) {
  const start = it.startDate.trim();
  const end = it.endDate.trim();
  if (start && !DATE_ONLY.test(start)) err(`${prefix}data de início inválida.`);
  if (end && !DATE_ONLY.test(end)) err(`${prefix}data final inválida.`);
  if (!start && end) err(`${prefix}informe a data de início.`);
  if (start && end && end < start) err(`${prefix}a data final é antes da inicial.`);
  return { startDate: start || null, endDate: start ? end || start : null };
}

function readItem(it: QuoteDraftItem, index: number, err: Collector): QuoteItem {
  const p = `Item ${index + 1}: `;
  if (!it.provider.trim()) err(`${p}informe o fornecedor.`);
  checkLength(it.provider, QUOTE_LIMITS.provider, `${p}o fornecedor passa de ${QUOTE_LIMITS.provider} caracteres.`, err);
  if (!it.title.trim()) err(`${p}informe o produto.`);
  checkLength(it.title, QUOTE_LIMITS.title, `${p}o produto passa de ${QUOTE_LIMITS.title} caracteres.`, err);
  const dates = readDates(it, p, err);
  const adults = readPeople(it.adults, 'adultos', p, err);
  const children = readPeople(it.children, 'crianças', p, err);
  const total = readMoney(it.total, true, () => err(`${p}informe o total do item (maior que zero).`));
  checkLength(it.description, QUOTE_LIMITS.description, `${p}a descrição passa de ${QUOTE_LIMITS.description} caracteres.`, err);
  return {
    provider: it.provider.trim(),
    title: it.title.trim(),
    ...dates,
    description: blankToNull(it.description),
    adults,
    children,
    // Preço por pessoa e cancelamento por item saíram (27/10/2026): a política é geral.
    priceAdult: null,
    priceChild: null,
    total: total ?? 0,
    cancellationPolicy: null,
    hotelName: it.hotelName ?? null,
    hotel: readHotel(it.hotel, p, err),
  };
}

/** A ficha vai como veio da API, só com o resumo (editável) conferido. */
function readHotel(hotel: QuoteHotel | null | undefined, prefix: string, err: Collector): QuoteHotel | null {
  if (!hotel) return null;
  const summary = hotel.summary.trim();
  if (!summary) err(`${prefix}escreva o resumo do hotel ou clique em "Não é este hotel".`);
  checkLength(summary, QUOTE_LIMITS.hotelSummary, `${prefix}o resumo do hotel passa de ${QUOTE_LIMITS.hotelSummary} caracteres.`, err);
  return { ...hotel, summary };
}

function readInstallments(draft: QuoteDraft, err: Collector) {
  const countRaw = draft.installmentsCount.trim();
  if (!countRaw) return null;
  const count = INTEGER.test(countRaw) ? Number(countRaw) : 0;
  if (count < 1 || count > MAX_QUOTE_INSTALLMENTS) {
    err(`Parcelas: de 1 a ${MAX_QUOTE_INSTALLMENTS}x.`);
    return null;
  }
  return draftInstallments(draft);
}

export function validateQuoteDraft(draft: QuoteDraft, currency: string): QuoteDraftResult {
  const errors: string[] = [];
  const err: Collector = (m) => errors.push(m);
  checkLength(draft.customerName, QUOTE_LIMITS.customerName, `O nome do cliente passa de ${QUOTE_LIMITS.customerName} caracteres.`, err);
  if (draft.items.length < 1 || draft.items.length > MAX_QUOTE_ITEMS) err(`A cotação precisa ter de 1 a ${MAX_QUOTE_ITEMS} itens.`);
  const items = draft.items.map((it, i) => readItem(it, i, err));
  const total = readMoney(draft.total, true, () => err('Informe o total da reserva (maior que zero).'));
  const pixTotal = readMoney(draft.pixTotal, false, () => err('O valor no Pix não é um número válido.'));
  const installments = readInstallments(draft, err);
  checkLength(draft.notes, QUOTE_LIMITS.notes, `A observação passa de ${QUOTE_LIMITS.notes} caracteres.`, err);
  if (errors.length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: {
      customerName: blankToNull(draft.customerName),
      quote: { items, currency, total: total ?? 0, pixTotal, installments, notes: blankToNull(draft.notes) },
    },
  };
}
