/**
 * Contatos da base na busca da inbox. A inbox lista conversas; o cliente da
 * carteira antiga (Umbler) que nunca escreveu no Sendtur não tem conversa e
 * sumia da busca. Ele aparece num bloco à parte, para começar a conversa.
 */

/** Com menos que isso a busca de contatos casaria a base inteira. */
export const MIN_BASE_SEARCH_CHARS = 2;
/** Quantos contatos da base mostrar de uma vez. */
export const BASE_RESULTS_LIMIT = 8;
/**
 * Quantos pedir à API: parte dos achados já tem conversa e sai do bloco, então
 * pedimos mais do que mostramos.
 */
export const BASE_FETCH_LIMIT = 30;

export function shouldSearchBase(term: string): boolean {
  return term.trim().length >= MIN_BASE_SEARCH_CHARS;
}

export function contactsWithoutConversation<T extends { _count?: { conversations: number } }>(
  contacts: readonly T[],
): T[] {
  return contacts.filter((c) => c._count?.conversations === 0);
}

/** "5511982015967" → "(11) 98201-5967". Fora do padrão BR, devolve "+dígitos". */
export function formatPhoneBr(phone: string | null | undefined): string {
  const digits = (phone ?? '').replace(/\D/g, '');
  if (!digits) return '';
  const local = digits.startsWith('55') && digits.length >= 12 ? digits.slice(2) : null;
  if (!local || (local.length !== 10 && local.length !== 11)) return `+${digits}`;
  const ddd = local.slice(0, 2);
  const rest = local.slice(2);
  const split = rest.length - 4;
  return `(${ddd}) ${rest.slice(0, split)}-${rest.slice(split)}`;
}
