import { parseMoneyBR } from '@/lib/money';
import type {
  CompetitorCompareRequest,
  CompetitorComparison,
  CompetitorOffer,
  CompetitorOfferStatus,
  CompetitorRequestItem,
  CompetitorSkipReason,
} from '../types';
import { formatQuoteMoney } from './quote-format';
import type { QuoteDraft, QuoteDraftItem } from './quote-draft';

/**
 * "Comparar com a concorrência" — só o atendente vê. Aqui fica o que não é
 * tela: o pedido montado do rascunho, a chave para saber se ele mudou depois
 * da comparação e os textos de cada situação.
 */

export const COMPETITOR_ERROR_MESSAGE = 'Não consegui comparar agora. Tente de novo em instantes.';
export const COMPETITOR_STALE_NOTE = 'Os itens mudaram depois da comparação. Compare de novo.';
export const COMPETITOR_ESTIMATE_NOTE =
  'a partir de = menor preço publicado para essa quantidade de dias; o total é estimado';

export const COMPETITOR_SKIP_TEXT: Record<CompetitorSkipReason, string> = {
  NO_DATE: 'Sem data: preencha a data inicial para comparar.',
  NOT_A_TICKET: 'Não achei este ingresso nas lojas da concorrência.',
  NO_MATCH: 'Não achei este ingresso nas lojas da concorrência.',
  NO_PEOPLE: 'Sem adultos nem crianças.',
  NO_PRICE: 'Sem valor neste item para comparar.',
};

export const COMPETITOR_STATUS_TEXT: Record<Exclude<CompetitorOfferStatus, 'OK'>, string> = {
  UNAVAILABLE: 'Sem disponibilidade na data',
  NOT_SOLD: 'Não vende',
  ERROR: 'Não consegui consultar',
};

const INTEGER = /^\d+$/;
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** "2" → 2; vazio, negativo ou lixo → 0 (a API diz NO_PEOPLE se der zero). */
function readCount(raw: string): number {
  const value = raw.trim();
  return INTEGER.test(value) ? Number(value) : 0;
}

/** "1.797,16" → 1797.16; ilegível ou negativo → 0 (a API diz NO_PRICE). */
function readTotal(raw: string): number {
  const value = parseMoneyBR(raw);
  return value !== null && value > 0 ? Math.round(value * 100) / 100 : 0;
}

function toRequestItem(item: QuoteDraftItem): CompetitorRequestItem {
  const startDate = item.startDate.trim();
  return {
    provider: item.provider.trim(),
    title: item.title.trim(),
    startDate: DATE_ONLY.test(startDate) ? startDate : null,
    adults: readCount(item.adults),
    children: readCount(item.children),
    total: readTotal(item.total),
  };
}

export function buildCompetitorRequest(draft: Pick<QuoteDraft, 'items'>): CompetitorCompareRequest {
  return { items: draft.items.map(toRequestItem) };
}

/** Chave estável do pedido: mudou a chave, a comparação na tela ficou velha. */
export function competitorRequestKey(request: CompetitorCompareRequest): string {
  return JSON.stringify(
    request.items.map((it) => [it.provider, it.title, it.startDate, it.adults, it.children, it.total]),
  );
}

export type CompetitorTone = 'theyCheaper' | 'weCheaper' | 'neutral';

/** Eles mais baratos = alerta; nós mais baratos = boa notícia. */
export function competitorOfferTone(offer: CompetitorOffer): CompetitorTone {
  // "A partir de" não é o mesmo produto: não pinta como mais barato/caro (o resumo da API também ignora).
  if (offer.status !== 'OK' || offer.isEstimate || offer.diff === null || offer.diff === 0) return 'neutral';
  return offer.diff < 0 ? 'theyCheaper' : 'weCheaper';
}

const PERCENT = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** "R$ 120,50 mais barato (3,2%)" · "mesmo preço" · null sem diferença calculada. */
export function formatCompetitorDiff(offer: CompetitorOffer, currency: string): string | null {
  if (offer.status !== 'OK' || offer.diff === null) return null;
  if (offer.diff === 0) return 'mesmo preço';
  const money = formatQuoteMoney(Math.abs(offer.diff), currency);
  const direction = offer.diff < 0 ? 'mais barato' : 'mais caro';
  const percent = offer.diffPercent === null ? '' : ` (${PERCENT.format(Math.abs(offer.diffPercent))}%)`;
  return `${money} ${direction}${percent}`;
}

export function hasCompetitorEstimates(result: CompetitorComparison): boolean {
  return result.items.some((item) => item.offers.some((offer) => offer.status === 'OK' && offer.isEstimate));
}

export function competitorStoreName(result: CompetitorComparison, storeId: string): string {
  return result.stores.find((store) => store.id === storeId)?.name ?? storeId;
}
