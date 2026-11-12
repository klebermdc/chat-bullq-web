import { describe, expect, it } from 'vitest';
import { STORE_LINK_ERROR, extractStoreLink, storeLinkIssue } from './store-link';

const LINK = 'https://reservas.orlandofastpass.com.br/pt/checkout/abc123';

describe('extractStoreLink', () => {
  it('aceita só o link', () => {
    expect(extractStoreLink(LINK)).toBe(LINK);
    expect(extractStoreLink(`  ${LINK}  `)).toBe(LINK);
  });

  it('acha o link no meio do texto copiado da loja, com a lista de produtos', () => {
    const text = [
      'Olá! Segue o seu carrinho:',
      LINK,
      '1x Magic Kingdom - 1 dia - Adulto R$ 900,00',
      '1x EPCOT - 1 dia - Criança R$ 850,00',
    ].join('\n');
    expect(extractStoreLink(text)).toBe(LINK);
  });

  it('pega o primeiro link de checkout quando há mais de um', () => {
    const other = 'https://reservas.orlandofastpass.com.br/en/checkout/zzz999';
    expect(extractStoreLink(`${LINK} e também ${other}`)).toBe(LINK);
  });

  it('ignora outros links da loja que não são o carrinho', () => {
    const text = `Veja https://reservas.orlandofastpass.com.br/pt/produtos/123 e depois ${LINK}`;
    expect(extractStoreLink(text)).toBe(LINK);
  });

  it('não leva a pontuação colada no fim', () => {
    expect(extractStoreLink(`Link: ${LINK}.`)).toBe(LINK);
    expect(extractStoreLink(`(${LINK})`)).toBe(LINK);
    expect(extractStoreLink(`${LINK},`)).toBe(LINK);
  });

  it('aceita idioma com região (pt-br)', () => {
    const link = 'https://reservas.orlandofastpass.com.br/pt-br/checkout/A1_b-2';
    expect(extractStoreLink(`texto ${link}`)).toBe(link);
  });

  it('recusa http, outro domínio e domínio parecido', () => {
    expect(extractStoreLink('http://reservas.orlandofastpass.com.br/pt/checkout/abc')).toBeNull();
    expect(extractStoreLink('https://loja.exemplo.com/pt/checkout/abc')).toBeNull();
    expect(extractStoreLink('https://reservas.orlandofastpass.com.br.golpe.com/pt/checkout/abc')).toBeNull();
    expect(extractStoreLink('https://xreservas.orlandofastpass.com.br/pt/checkout/abc')).toBeNull();
  });

  it('sem link de checkout devolve null', () => {
    expect(extractStoreLink('')).toBeNull();
    expect(extractStoreLink('Magic Kingdom R$ 900,00')).toBeNull();
    expect(extractStoreLink('https://reservas.orlandofastpass.com.br/pt/checkout/')).toBeNull();
  });
});

describe('storeLinkIssue', () => {
  it('campo vazio não é erro', () => {
    expect(storeLinkIssue('')).toBeNull();
    expect(storeLinkIssue('   ')).toBeNull();
  });

  it('com o link no texto não há erro', () => {
    expect(storeLinkIssue(`carrinho: ${LINK}`)).toBeNull();
  });

  it('texto sem o link mostra o erro', () => {
    expect(storeLinkIssue('Magic Kingdom R$ 900,00')).toBe(STORE_LINK_ERROR);
  });
});
