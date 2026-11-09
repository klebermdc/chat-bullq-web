import { describe, expect, it } from 'vitest';
import { OTHER_CATEGORY, listCategories, searchCatalog } from './quick-reply-catalog';

const r = (shortcut: string, title: string, content: string, category: string | null = null) => ({
  id: shortcut,
  shortcut,
  title,
  content,
  category,
});

const LIST = [
  r('dis-linkar', 'Disney: linkar e-ticket', 'Baixe o app My Disney Experience', 'Disney'),
  r('seg-dados', 'Seguro: pedir dados', 'Data de saída e idade de todos', 'Seguro viagem'),
  r('pix', 'Chave Pix', 'Nossa chave é 123'),
  r('dis-das', 'Disney: DAS', 'Serviço de acessibilidade', ' Disney '),
];

describe('listCategories', () => {
  it('conta por categoria em ordem alfabética, com "Outras" por último', () => {
    expect(listCategories(LIST)).toEqual([
      { name: 'Disney', count: 2 },
      { name: 'Seguro viagem', count: 1 },
      { name: OTHER_CATEGORY, count: 1 },
    ]);
  });
});

describe('searchCatalog', () => {
  it('sem busca e sem categoria devolve tudo, sem limite', () => {
    expect(searchCatalog(LIST, '', null)).toHaveLength(4);
  });

  it('filtra pela categoria escolhida', () => {
    expect(searchCatalog(LIST, '', 'Disney').map((x) => x.id)).toEqual(['dis-linkar', 'dis-das']);
    expect(searchCatalog(LIST, '', OTHER_CATEGORY).map((x) => x.id)).toEqual(['pix']);
  });

  it('busca no atalho, no título e no texto, sem acento', () => {
    expect(searchCatalog(LIST, 'saida', null).map((x) => x.id)).toEqual(['seg-dados']);
    expect(searchCatalog(LIST, '/PIX', null).map((x) => x.id)).toEqual(['pix']);
    expect(searchCatalog(LIST, 'acessibilidade', 'Disney').map((x) => x.id)).toEqual(['dis-das']);
  });

  it('atalho que começa com a busca vem antes', () => {
    const list = [r('a-seg', 'Outro', 'fala de seg'), r('seg-x', 'Seg', 'x')];
    expect(searchCatalog(list, 'seg', null).map((x) => x.id)).toEqual(['seg-x', 'a-seg']);
  });
});
