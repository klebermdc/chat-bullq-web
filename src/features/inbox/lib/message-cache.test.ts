import { describe, it, expect, vi } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import {
  loadOlderIntoCache,
  messagesQueryKey,
  prependMessages,
  replaceMessages,
} from './message-cache';
import type { Message } from '../services/inbox.service';

const CONVERSATION_ID = 'conv-1';

function msg(id: string): Message {
  return { id, conversationId: CONVERSATION_ID } as Message;
}

function idsIn(qc: QueryClient): string[] {
  const cache = qc.getQueryData<{ messages: Message[] }>(messagesQueryKey(CONVERSATION_ID));
  return (cache?.messages ?? []).map((m) => m.id);
}

function seed(messages: Message[]): QueryClient {
  const qc = new QueryClient();
  qc.setQueryData(messagesQueryKey(CONVERSATION_ID), { messages });
  return qc;
}

describe('prependMessages', () => {
  it('emenda a página anterior antes do que já estava carregado', () => {
    const qc = seed([msg('c'), msg('d')]);

    prependMessages(qc, CONVERSATION_ID, [msg('a'), msg('b')]);

    expect(idsIn(qc)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('não duplica quando a página anterior encosta no que já está na tela', () => {
    const qc = seed([msg('b'), msg('c')]);

    prependMessages(qc, CONVERSATION_ID, [msg('a'), msg('b')]);

    expect(idsIn(qc)).toEqual(['a', 'b', 'c']);
  });

  it('preserva os outros campos do cache', () => {
    const qc = new QueryClient();
    qc.setQueryData(messagesQueryKey(CONVERSATION_ID), {
      messages: [msg('b')],
      hasMore: true,
    });

    prependMessages(qc, CONVERSATION_ID, [msg('a')]);

    expect(
      qc.getQueryData<{ hasMore: boolean }>(messagesQueryKey(CONVERSATION_ID))?.hasMore,
    ).toBe(true);
  });

  it('funciona com o cache ainda vazio', () => {
    const qc = new QueryClient();

    prependMessages(qc, CONVERSATION_ID, [msg('a')]);

    expect(idsIn(qc)).toEqual(['a']);
  });
});

describe('loadOlderIntoCache', () => {
  it('parte da mensagem mais antiga carregada', async () => {
    const qc = seed([msg('c'), msg('d')]);
    const fetchOlder = vi.fn().mockResolvedValue({ messages: [msg('a')] });

    await loadOlderIntoCache(qc, CONVERSATION_ID, fetchOlder);

    expect(fetchOlder).toHaveBeenCalledWith('c');
  });

  it('não busca nada quando ainda não há mensagem na tela', async () => {
    const qc = new QueryClient();
    const fetchOlder = vi.fn();

    const result = await loadOlderIntoCache(qc, CONVERSATION_ID, fetchOlder);

    expect(result).toBeNull();
    expect(fetchOlder).not.toHaveBeenCalled();
  });

  it('não perde a mensagem que chega pelo socket DURANTE o fetch', async () => {
    // A corrida que apagava mensagem: a lista era lida antes do fetch e escrita
    // ~200ms depois. Quem chegasse nesse intervalo era sobrescrito e sumia — e
    // sumia de vez, porque carregar histórico desliga o refetch por foco, então
    // nada a trazia de volta. Por isso o `await` é exercido aqui dentro: um
    // teste que só chamasse a emenda depois do socket passaria mesmo com o bug.
    const qc = seed([msg('c')]);
    let responder!: (page: { messages: Message[] }) => void;
    const emVoo = new Promise<{ messages: Message[] }>((resolve) => {
      responder = resolve;
    });

    const fluxo = loadOlderIntoCache(qc, CONVERSATION_ID, () => emVoo);

    // Fetch em voo: o socket entrega uma mensagem nova.
    qc.setQueryData<{ messages: Message[] }>(messagesQueryKey(CONVERSATION_ID), (prev) => ({
      messages: [...(prev?.messages ?? []), msg('nova')],
    }));
    responder({ messages: [msg('a')] });
    await fluxo;

    expect(idsIn(qc)).toEqual(['a', 'c', 'nova']);
  });

  it('devolve a resposta do fetch para o chamador seguir com hasMore', async () => {
    const qc = seed([msg('c')]);

    const result = await loadOlderIntoCache(qc, CONVERSATION_ID, async () => ({
      messages: [msg('a')],
      hasMore: false,
    }));

    expect(result).toEqual({ messages: [msg('a')], hasMore: false });
  });

  it('não mexe no cache quando a página anterior vem vazia', async () => {
    const qc = seed([msg('c')]);

    await loadOlderIntoCache(qc, CONVERSATION_ID, async () => ({ messages: [] }));

    expect(idsIn(qc)).toEqual(['c']);
  });
});

describe('replaceMessages', () => {
  it('troca a lista inteira ao pular para uma mensagem da busca', () => {
    const qc = seed([msg('a'), msg('b')]);

    replaceMessages(qc, CONVERSATION_ID, [msg('x'), msg('y')]);

    expect(idsIn(qc)).toEqual(['x', 'y']);
  });
});
