import type { Message, ReplyContext } from '../services/inbox.service';

export interface ResolvedQuote {
  messageId?: string;
  previewText?: string;
  senderName?: string;
}

export const QUOTE_NOT_LOADED = 'Mensagem citada (fora do histórico carregado)';

function previewOf(m: Pick<Message, 'type' | 'content'>): string {
  const c = (m.content ?? {}) as Record<string, any>;
  return (typeof c.text === 'string' && c.text) || (typeof c.caption === 'string' && c.caption) || `[${String(m.type).toLowerCase()}]`;
}

/**
 * O que mostrar na caixa de citação de uma mensagem. Resposta a story/anúncio
 * tem cartão próprio. Mensagens antigas só guardaram o id da citada — nesse
 * caso procura a original entre as já carregadas; não achando, avisa em vez
 * de esconder (antes a citação do cliente simplesmente não aparecia).
 */
export function resolveQuote(
  replyTo: ReplyContext | null | undefined,
  loaded: Message[],
): ResolvedQuote | null {
  if (!replyTo || replyTo.story || replyTo.ad) return null;
  if (replyTo.previewText || replyTo.senderName) {
    return { messageId: replyTo.messageId, previewText: replyTo.previewText, senderName: replyTo.senderName };
  }
  if (!replyTo.externalMessageId) return null;

  const original = loaded.find((m) => m.externalId === replyTo.externalMessageId);
  if (!original) return { previewText: QUOTE_NOT_LOADED };
  const senderName =
    original.direction === 'OUTBOUND'
      ? (original.sender?.name ?? original.senderName ?? undefined)
      : (original.senderName ?? undefined);
  return { messageId: original.id, previewText: previewOf(original), senderName };
}
