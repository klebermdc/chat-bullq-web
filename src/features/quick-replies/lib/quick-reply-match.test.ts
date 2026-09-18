import { describe, expect, it } from 'vitest';
import { applyQuickReply, fillVariables, filterQuickReplies, slashQueryAt } from './quick-reply-match';

describe('slashQueryAt', () => {
  it('detecta "/" no começo do texto', () => {
    expect(slashQueryAt('/pi', 3)).toEqual({ query: 'pi', start: 0, end: 3 });
  });
  it('detecta "/" logo depois de espaço ou quebra de linha', () => {
    expect(slashQueryAt('oi /bo', 6)).toEqual({ query: 'bo', start: 3, end: 6 });
    expect(slashQueryAt('oi\n/', 4)).toEqual({ query: '', start: 3, end: 4 });
  });
  it('ignora barra no meio de palavra ou link', () => {
    expect(slashQueryAt('e/ou', 4)).toBeNull();
    expect(slashQueryAt('https://site.com', 16)).toBeNull();
  });
  it('some quando o atalho já tem espaço depois', () => {
    expect(slashQueryAt('/pix ', 5)).toBeNull();
  });
  it('olha só até o cursor', () => {
    expect(slashQueryAt('/pix e mais', 2)).toEqual({ query: 'p', start: 0, end: 2 });
  });
});

const list = [
  { id: '1', shortcut: 'pix', title: 'Chave Pix', content: 'x' },
  { id: '2', shortcut: 'boas-vindas', title: 'Saudação', content: 'y' },
  { id: '3', shortcut: 'endereco', title: 'Endereço do escritório', content: 'z' },
];

describe('filterQuickReplies', () => {
  it('query vazia lista tudo', () => {
    expect(filterQuickReplies(list, '').map((q) => q.id)).toEqual(['1', '2', '3']);
  });
  it('atalho que começa com a busca vem antes de quem só contém no título', () => {
    // "endereco" começa com "e"; "Chave Pix" só contém "e" no título.
    expect(filterQuickReplies(list, 'e').map((q) => q.id)).toEqual(['3', '1']);
  });
  it('busca no título ignorando acento e maiúscula', () => {
    expect(filterQuickReplies(list, 'saudacao').map((q) => q.id)).toEqual(['2']);
  });
});

describe('fillVariables', () => {
  it('troca nome e primeiro nome do contato', () => {
    expect(fillVariables('Oi {{primeiro_nome}}! ({{nome}})', 'Maria Souza')).toBe('Oi Maria! (Maria Souza)');
  });
  it('sem nome, remove a variável sem deixar chaves', () => {
    expect(fillVariables('Oi {{primeiro_nome}}, tudo bem?', null)).toBe('Oi, tudo bem?');
  });
  it('não mexe em variável desconhecida', () => {
    expect(fillVariables('Valor {{valor}}', 'Ana')).toBe('Valor {{valor}}');
  });
});

describe('applyQuickReply', () => {
  it('troca o /atalho pelo conteúdo e põe o cursor no fim', () => {
    const match = { query: 'pi', start: 3, end: 6 };
    expect(applyQuickReply('oi /pi resto', match, 'Chave: 123')).toEqual({ text: 'oi Chave: 123 resto', caret: 13 });
  });
});
