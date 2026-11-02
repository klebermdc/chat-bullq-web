import { describe, expect, it } from 'vitest';
import { pageCount, quoteProducts, quoteRow, quotesOf, type QuoteRowSource } from './quote-list';

const NOW = new Date('2026-10-26T20:00:00.000Z'); // 17h em Brasília

const item = (hotelName: string | null, title: string) => ({
  provider: 'Booking', title, startDate: null, endDate: null, description: null, adults: 2, children: 0,
  priceAdult: null, priceChild: null, total: 100, cancellationPolicy: null, hotelName,
});

const base: QuoteRowSource = {
  id: 'p1',
  kind: 'QUOTE',
  createdAt: '2026-10-26T12:00:00.000Z',
  quoteUrl: 'https://cotacao.orlandofastpass.com.br/abc',
  expiresAt: '2026-10-27T21:00:00.000Z',
  viewCount: 0,
  quoteNumber: 152,
  totalValue: '3042.45',
  currency: 'BRL',
  details: {
    customerName: 'Ana Souza',
    quote: { items: [item('Blue Tree Morumbi', 'Deluxe')], currency: 'BRL', total: 3042.45, pixTotal: null, installments: null, notes: null },
  },
};

describe('quoteRow', () => {
  it('número, cliente da cotação, total, data e o que foi cotado', () => {
    expect(quoteRow({ ...base, contact: { name: 'Ana S.', phone: '5511999990000' } }, NOW)).toMatchObject({
      number: 'nº 0152',
      customer: 'Ana Souza',
      phone: '5511999990000',
      total: 'R$\u00a03.042,45',
      createdAt: '26/10 09:00',
      products: 'Blue Tree Morumbi',
      opened: 'ainda não abriu',
      expiry: 'vence 27/10, às 18h',
      isExpired: false,
    });
  });

  it('sem nome na cotação usa o contato; sem contato, o aviso', () => {
    const noName = { ...base, details: { quote: base.details!.quote } };
    expect(quoteRow({ ...noName, contact: { name: 'Ana S.', phone: null } }, NOW).customer).toBe('Ana S.');
    expect(quoteRow(noName, NOW).customer).toBe('Cliente sem nome');
  });

  it('cotação antiga sem número não quebra', () => {
    expect(quoteRow({ ...base, quoteNumber: null }, NOW).number).toBeNull();
  });
});

describe('quoteProducts', () => {
  it('hotel pelo nome, outro item pelo título; mais de dois vira "+N"', () => {
    const items = [item('Blue Tree', 'Deluxe'), item(null, 'Magic Kingdom'), item(null, 'Seguro'), item(null, 'Carro')];
    expect(quoteProducts(items)).toBe('Blue Tree · Magic Kingdom +2');
  });

  it('sem itens fica vazio', () => {
    expect(quoteProducts(undefined)).toBe('');
  });
});

describe('quotesOf', () => {
  it('só cotações por link, sem a que já está na tela', () => {
    const list = [{ ...base, id: 'a' }, { ...base, id: 'b', kind: 'PARKS' as const }, { ...base, id: 'c' }];
    expect(quotesOf(list, 'a').map((q) => q.id)).toEqual(['c']);
    expect(quotesOf(undefined)).toEqual([]);
  });
});

describe('pageCount', () => {
  it('arredonda para cima e tem pelo menos 1', () => {
    expect(pageCount(41, 20)).toBe(3);
    expect(pageCount(40, 20)).toBe(2);
    expect(pageCount(0, 20)).toBe(1);
  });
});
