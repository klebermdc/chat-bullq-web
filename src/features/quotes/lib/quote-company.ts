import type { QuoteCompany, QuoteTerms } from '../types';

/**
 * Dados da empresa e aviso de câmbio que a API põe em toda cotação pública
 * (QUOTE_COMPANY e QUOTE_TERMS em proposals/quote-company.ts e quote-terms.ts
 * da API). Aqui só servem à prévia antes do envio, que não passa pela API:
 * se mudarem lá, mudar aqui também.
 */
export const QUOTE_COMPANY: Readonly<QuoteCompany> = Object.freeze({
  name: 'Orlando Fast Pass',
  tagline: 'A magia começa aqui!',
  cnpj: '33.142.150/0001-99',
  instagram: 'orlando.fastpass',
  facebook: 'orlandofastpass',
  site: 'https://www.orlandofastpass.com.br',
  hours: 'Segunda a sexta, das 8h às 18h',
});

export const QUOTE_EXCHANGE_NOTICE =
  'Os ingressos são cobrados em dólar. Os valores em reais seguem o câmbio do dia e podem mudar a qualquer momento até a confirmação do pagamento.';

/**
 * Regras como a página usa: só o aviso de câmbio aparece nela. A política de
 * cancelamento completa vive na API (página e PDF não a mostram aqui).
 */
export const QUOTE_PREVIEW_TERMS: Readonly<QuoteTerms> = Object.freeze({
  exchangeNotice: QUOTE_EXCHANGE_NOTICE,
  cancellation: { title: 'Política de Cancelamento e Alterações', revisedAt: '', blocks: [] },
});
