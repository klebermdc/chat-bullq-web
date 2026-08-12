import type { QueryClient } from '@tanstack/react-query';
import { prependUnique } from './contact-history';
import type { Message } from '../services/inbox.service';

interface MessagesCache {
  messages: Message[];
}

/** Chave única do cache de mensagens de uma conversa. */
export function messagesQueryKey(conversationId: string): [string, string] {
  return ['messages', conversationId];
}

/**
 * Emenda a página anterior no cache, calculando a lista no INSTANTE da escrita.
 *
 * A assinatura é a defesa: a função não aceita a lista atual como parâmetro,
 * justamente para ninguém poder passar uma foto lida antes do fetch. Calcular a
 * emenda a partir dessa foto abria uma janela de ~200ms em que uma mensagem
 * chegando pelo socket era sobrescrita e sumia da tela — e sumia de vez, porque
 * carregar histórico desliga o refetch por foco, então nada a trazia de volta.
 */
export function prependMessages(
  queryClient: QueryClient,
  conversationId: string,
  older: Message[],
): void {
  queryClient.setQueryData<MessagesCache>(
    messagesQueryKey(conversationId),
    (prev) => ({
      ...(prev ?? ({} as MessagesCache)),
      messages: prependUnique(older, prev?.messages ?? []),
    }),
  );
}

/**
 * Busca a página anterior e a emenda no cache.
 *
 * A busca mora aqui de propósito. A corrida que apagava mensagem nascia entre
 * a leitura do cache e a escrita, com um `await` no meio: quem lia a lista
 * antes do fetch e a escrevia depois sobrescrevia o que tivesse chegado pelo
 * socket nesse intervalo. Guardando o `await` junto da emenda, o único dado
 * que atravessa a espera é o id do cursor — e id não sobrescreve nada.
 *
 * @param fetchOlder recebe o id da mensagem mais antiga já carregada.
 * @returns a resposta do fetch, ou `null` se não havia de onde partir.
 */
export async function loadOlderIntoCache<T extends { messages: Message[] }>(
  queryClient: QueryClient,
  conversationId: string,
  fetchOlder: (oldestMessageId: string) => Promise<T>,
): Promise<T | null> {
  const cached = queryClient.getQueryData<MessagesCache>(messagesQueryKey(conversationId));
  const oldest = cached?.messages?.[0];
  if (!oldest) return null;

  const older = await fetchOlder(oldest.id);
  if (older.messages.length > 0) {
    prependMessages(queryClient, conversationId, older.messages);
  }
  return older;
}

/** Troca a lista inteira — usado ao pular para uma mensagem da busca. */
export function replaceMessages(
  queryClient: QueryClient,
  conversationId: string,
  next: Message[],
): void {
  queryClient.setQueryData<MessagesCache>(
    messagesQueryKey(conversationId),
    (prev) => ({ ...(prev ?? ({} as MessagesCache)), messages: next }),
  );
}
