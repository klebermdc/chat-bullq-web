/**
 * Link do carrinho da Just Travel (loja online da Orlando Fast Pass).
 * O atendente costuma colar o texto inteiro que copiou da loja — o link e a
 * lista de produtos. Aqui só se acha o primeiro link de checkout, no mesmo
 * formato que a API aceita: https://reservas.orlandofastpass.com.br/<idioma>/checkout/<id>.
 */

const STORE_CHECKOUT_RE = /(?<![\w.-])https:\/\/reservas\.orlandofastpass\.com\.br\/[a-z]{2}(?:-[a-z]{2})?\/checkout\/[\w-]+/i;

export const STORE_LINK_ERROR =
  'Não achei o link do carrinho da Just Travel. Ele começa com https://reservas.orlandofastpass.com.br/ e tem /checkout/ no meio.';

/** Primeiro link de checkout da loja no texto colado, ou null. */
export function extractStoreLink(text: string): string | null {
  const match = STORE_CHECKOUT_RE.exec(text);
  return match ? match[0] : null;
}

/** Erro do campo: vazio não é erro; texto sem o link é. */
export function storeLinkIssue(text: string): string | null {
  if (!text.trim()) return null;
  return extractStoreLink(text) ? null : STORE_LINK_ERROR;
}
