/**
 * Aviso quando a IA leu só parte dos prints: os lidos já viraram itens, os
 * outros ficam de fora — o atendente precisa saber quais, pelo nome.
 */
export function unreadPrintsNotice(positions: readonly number[] | undefined, names: readonly string[]): string | null {
  if (!positions?.length) return null;
  const list = positions.map((n) => `"${names[n - 1] ?? `print ${n}`}"`).join(', ');
  if (positions.length === 1) {
    return `Não consegui ler o print ${list}. Ele ficou de fora da cotação: confira se está legível e anexe de novo em "Adicionar item por print".`;
  }
  return `Não consegui ler os prints ${list}. Eles ficaram de fora da cotação: confira se estão legíveis e anexe de novo em "Adicionar item por print".`;
}
