import { describe, expect, it } from 'vitest';
import { contactsWithoutConversation, formatPhoneBr, MIN_BASE_SEARCH_CHARS, shouldSearchBase } from './base-contacts';

describe('formatPhoneBr', () => {
  it('formata celular com 55', () => {
    expect(formatPhoneBr('5511982015967')).toBe('(11) 98201-5967');
  });

  it('formata fixo/celular antigo sem o 9', () => {
    expect(formatPhoneBr('551182015967')).toBe('(11) 8201-5967');
  });

  it('número estrangeiro ou estranho volta como veio, com +', () => {
    expect(formatPhoneBr('14075551234')).toBe('+14075551234');
  });

  it('vazio vira texto vazio', () => {
    expect(formatPhoneBr(null)).toBe('');
  });
});

describe('shouldSearchBase', () => {
  it(`só busca a base com pelo menos ${MIN_BASE_SEARCH_CHARS} caracteres`, () => {
    expect(shouldSearchBase('a')).toBe(false);
    expect(shouldSearchBase('  jo ')).toBe(true);
  });
});

describe('contactsWithoutConversation', () => {
  it('fica só com quem não tem conversa', () => {
    const list = [
      { id: 'a', _count: { conversations: 0 } },
      { id: 'b', _count: { conversations: 2 } },
      { id: 'c' },
    ];

    expect(contactsWithoutConversation(list).map((c) => c.id)).toEqual(['a']);
  });
});
