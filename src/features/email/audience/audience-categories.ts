/**
 * Categorias reais encontradas no HUB (levantado em produção, ver
 * docs/superpowers/specs/2026-08-04-email-segmentacao-design.md §2). É o
 * campo `produto` normalizado — tipo do item comprado, nunca o parque.
 *
 * Lista fechada de propósito: sem um endpoint que devolva os valores
 * distintos hoje em uso, oferecer só o que se sabe existir evita um filtro
 * que parece válido mas nunca bate com ninguém.
 */
export const AUDIENCE_CATEGORY_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'ingresso', label: 'Ingresso' },
  { value: 'hotel', label: 'Hotel' },
  { value: 'carro', label: 'Carro' },
  { value: 'seguro', label: 'Seguro' },
  { value: 'guiamento', label: 'Guiamento' },
];

/**
 * A primeira pergunta que quem monta um filtro vai fazer é "dá pra
 * segmentar por parque (Disney, Universal...)?". Este texto responde antes
 * de a pessoa procurar e não achar.
 */
export const CATEGORY_NOT_PARK_NOTICE =
  'Categoria é o tipo do item comprado — ingresso, hotel, carro, seguro, guiamento. ' +
  'Não é o parque (Disney, Universal…): esse dado não existe na origem dos pedidos.';
