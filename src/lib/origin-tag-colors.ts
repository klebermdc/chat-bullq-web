/**
 * Cores de marca para os selos de ORIGEM de lead.
 *
 * Essas tags (ex.: "Instagram Orgânico", "Anúncio Meta") são criadas sem cor,
 * então renderizam em cinza. Aqui damos a elas a cor da plataforma de origem
 * onde quer que a tag apareça (lista do inbox, contatos, etc.), sem depender de
 * ninguém pintar a tag à mão no banco. Chave = nome EXATO da tag.
 */
export const ORIGIN_TAG_COLORS: Record<string, string> = {
  'Instagram Orgânico': '#E1306C', // rosa/magenta do Instagram
  'Anúncio Meta': '#0866FF', // azul do Meta
};

/** Cinza neutro quando a tag não tem cor conhecida nem cor no banco. */
const NEUTRAL_TAG_COLOR = '#71717a';

/**
 * Cor efetiva de uma tag: usa a cor de origem (se o nome for conhecido),
 * senão a cor do banco, senão um cinza neutro. Nunca retorna vazio — evita
 * pills sem cor (`backgroundColor: undefined`).
 */
export function tagColor(tag: {
  name?: string | null;
  color?: string | null;
}): string {
  const byName = tag?.name ? ORIGIN_TAG_COLORS[tag.name] : undefined;
  return byName ?? tag?.color ?? NEUTRAL_TAG_COLOR;
}
