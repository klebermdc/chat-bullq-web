/**
 * Histórico do contato: as mensagens dos atendimentos ANTERIORES, que vivem em
 * outras conversas (outro protocolo, às vezes outro número) e por isso não
 * aparecem no timeline normal.
 */

/**
 * Emenda a página anterior no começo da lista.
 *
 * A conversa atual é paginada por `created_at` e o histórico do contato pelo
 * tempo do provedor — chaves diferentes podem devolver de novo uma mensagem já
 * carregada na virada. Mantém a versão que já estava na tela (ela pode ter
 * recebido atualização de status pelo socket).
 */
export function prependUnique<T extends { id: string }>(
  older: readonly T[],
  current: readonly T[],
): T[] {
  const known = new Set(current.map((m) => m.id));
  return [...older.filter((m) => !known.has(m.id)), ...current];
}

/**
 * Diz se esta mensagem abre um atendimento — é onde a divisória entra. A
 * primeira da lista sempre abre: ou é o começo do histórico, ou é a mais antiga
 * que se carregou até agora.
 */
export function isConversationBoundary(
  messages: readonly { conversationId: string }[],
  index: number,
): boolean {
  if (index === 0) return true;
  return messages[index].conversationId !== messages[index - 1].conversationId;
}
