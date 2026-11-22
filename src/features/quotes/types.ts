/**
 * Cotação por link — tipos iguais aos da API (contrato v1.1).
 * NUNCA há CPF nem nome de viajante aqui: o print traz, a cotação não guarda.
 */

export interface QuoteItem {
  provider: string;
  title: string;
  /** YYYY-MM-DD */
  startDate: string | null;
  /** YYYY-MM-DD (igual a startDate quando é 1 dia) */
  endDate: string | null;
  description: string | null;
  adults: number;
  children: number;
  priceAdult: number | null;
  priceChild: number | null;
  total: number;
  cancellationPolicy: string | null;
  /** Nome do hotel lido do print (cotações antigas não têm). */
  hotelName?: string | null;
  /** Ficha do hotel (LiteAPI): só conteúdo, nunca preço. */
  hotel?: QuoteHotel | null;
}

/** Ficha resumida do hotel, em português, com fotos do CDN da LiteAPI. */
export interface QuoteHotel {
  id: string;
  name: string;
  stars: number | null;
  address: string | null;
  summary: string;
  amenities: string[];
  /** "16h" */
  checkin: string | null;
  checkout: string | null;
  photos: string[];
}

export interface QuoteInstallments {
  count: number;
  value: number;
}

export interface QuoteData {
  items: QuoteItem[];
  currency: string;
  total: number;
  pixTotal: number | null;
  installments: QuoteInstallments | null;
  notes: string | null;
}

/**
 * A cotação como o painel lê e grava (`details.quote`): o que o cliente vê
 * mais o link da loja online, que é só do atendente. A página pública usa
 * `QuoteData`, sem esse campo. Ausente nas cotações antigas.
 */
export interface StoredQuoteData extends QuoteData {
  storeUrl?: string | null;
}

export interface QuoteCompany {
  name: string;
  tagline: string;
  cnpj: string;
  instagram: string;
  facebook: string;
  site: string;
  hours: string;
}

export type QuoteTermsBlock = { kind: 'p'; text: string } | { kind: 'list'; items: string[] };

/** Regras gerais, iguais para toda cotação: aviso de câmbio e cancelamento. */
export interface QuoteTerms {
  exchangeNotice: string;
  cancellation: { title: string; revisedAt: string; blocks: QuoteTermsBlock[] };
}

export type PublicQuoteStatus = 'ACTIVE' | 'EXPIRED';

/** GET /public/quotes/:token (já desembrulhado do envelope `data`). */
export interface PublicQuoteView {
  status: PublicQuoteStatus;
  code: string;
  customerName: string | null;
  seller: { name: string; whatsapp: string | null };
  /** Ausente numa API anterior ao adendo v1.1. */
  company: QuoteCompany | null;
  /** Ausente numa API anterior a 27/10/2026: a página só esconde os blocos. */
  terms?: QuoteTerms | null;
  createdAt: string;
  expiresAt: string;
  /** Última atualização pelo atendente (mesmo link). Ausente numa API anterior a 28/10/2026. */
  updatedAt?: string | null;
  quote: QuoteData;
}

/** Toda cotação vale 24 horas (o câmbio muda); a API aplica o padrão. */
export const QUOTE_VALIDITY_HOURS = 24;

/** Resposta do preview com format LINK: nada foi gravado nem enviado. */
export interface QuotePreview {
  preview: true;
  quote: StoredQuoteData;
  customerName: string | null;
  /** Posição (1, 2…) dos prints que a IA não conseguiu ler. Ausente numa API antiga. */
  unreadPrints?: number[];
}

/** Preços do carrinho da Just Travel, lidos do link pela API (sem IA). Só o atendente vê. */
export interface StoreOffer {
  pixTotal: number | null;
  /** Total no cartão parcelado (o 10x). */
  installmentsTotal: number | null;
  installmentsCount: number | null;
}

/** Preview com `storeLink`: os itens vêm do carrinho da loja, não de print. */
export interface StoreQuotePreview extends QuotePreview {
  storeOffer: StoreOffer;
}

/* ── Comparar com a concorrência (só o atendente vê) ───────────────────── */

/** Um item da cotação como vai para a comparação: só o que a loja precisa. */
export interface CompetitorRequestItem {
  provider: string;
  title: string;
  /** YYYY-MM-DD; null quando o item não tem data. */
  startDate: string | null;
  adults: number;
  children: number;
  total: number;
}

export interface CompetitorCompareRequest {
  items: CompetitorRequestItem[];
}

/** isEstimate = a loja só publica "a partir de". */
export interface CompetitorStore {
  id: string;
  name: string;
  isEstimate: boolean;
}

/** UNAVAILABLE = vende, mas sem data; NOT_SOLD = não vende; ERROR = não deu para consultar. */
export type CompetitorOfferStatus = 'OK' | 'UNAVAILABLE' | 'NOT_SOLD' | 'ERROR';

export interface CompetitorOffer {
  storeId: string;
  status: CompetitorOfferStatus;
  /** Total no cartão (padrão da loja) para todas as pessoas, em reais. */
  total: number | null;
  /** Total à vista / Pix, quando a loja mostra. */
  cashTotal: number | null;
  maxInstallments: number | null;
  /** "a partir de" (versão mais barata): o total é estimado. */
  isEstimate: boolean;
  /** Total deles − o nosso: negativo = eles estão mais baratos. */
  diff: number | null;
  diffPercent: number | null;
}

export type CompetitorSkipReason = 'NO_DATE' | 'NOT_A_TICKET' | 'NO_MATCH' | 'NO_PEOPLE' | 'NO_PRICE';

export interface CompetitorItemResult {
  /** Posição do item no pedido. */
  index: number;
  title: string;
  ourTotal: number;
  /** Produto que foi comparado nas lojas. */
  match: { name: string; days: number } | null;
  /** Preenchido = item não comparado (offers vazio). */
  reason: CompetitorSkipReason | null;
  offers: CompetitorOffer[];
}

export interface CompetitorComparison {
  checkedAt: string;
  stores: CompetitorStore[];
  items: CompetitorItemResult[];
  summary: string[];
}
