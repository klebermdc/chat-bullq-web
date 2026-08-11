import { describe, expect, it } from 'vitest';
import { isConversationBoundary, prependUnique } from './contact-history';

describe('prependUnique', () => {
  it('coloca as anteriores na frente', () => {
    expect(prependUnique([{ id: 'a' }], [{ id: 'b' }])).toEqual([
      { id: 'a' },
      { id: 'b' },
    ]);
  });

  it('descarta a repetida da emenda mantendo a versão já carregada', () => {
    expect(
      prependUnique([{ id: 'a' }, { id: 'b' }], [{ id: 'b' }, { id: 'c' }]),
    ).toEqual([{ id: 'a' }, { id: 'b' }, { id: 'c' }]);
  });

  it('página vazia não mexe na lista', () => {
    expect(prependUnique([], [{ id: 'a' }])).toEqual([{ id: 'a' }]);
  });
});

describe('isConversationBoundary', () => {
  const messages = [
    { conversationId: 'velha' },
    { conversationId: 'velha' },
    { conversationId: 'atual' },
  ];

  it('a primeira mensagem da lista sempre abre um atendimento', () => {
    expect(isConversationBoundary(messages, 0)).toBe(true);
  });

  it('não marca no meio do mesmo atendimento', () => {
    expect(isConversationBoundary(messages, 1)).toBe(false);
  });

  it('marca na troca de atendimento', () => {
    expect(isConversationBoundary(messages, 2)).toBe(true);
  });

  it('lista de uma conversa só nunca marca depois da primeira', () => {
    const single = [{ conversationId: 'atual' }, { conversationId: 'atual' }];
    expect(isConversationBoundary(single, 1)).toBe(false);
  });
});
