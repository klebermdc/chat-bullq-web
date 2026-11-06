import { describe, expect, it } from 'vitest';
import { groupQuoteItems, itemKind } from './quote-groups';
import type { QuoteItem } from '../types';

function item(over: Partial<QuoteItem> = {}): QuoteItem {
  return {
    provider: 'Universal Orlando Resort',
    title: 'Ingresso 2 Parques',
    startDate: '2027-01-01',
    endDate: '2027-01-01',
    description: null,
    adults: 2,
    children: 0,
    priceAdult: null,
    priceChild: null,
    total: 100,
    cancellationPolicy: null,
    ...over,
  };
}

describe('itemKind', () => {
  it.each([
    [item(), 'tickets'],
    [item({ provider: 'Walt Disney World Resort', title: '4 dias de ingressos' }), 'tickets'],
    [item({ provider: 'SeaWorld Parks', title: 'SeaWorld Orlando 1 Dia' }), 'tickets'],
    [item({ provider: 'Operadora X', title: 'Ingresso especial' }), 'tickets'],
    [item({ provider: 'Disney Jollywood Nights', title: 'Disney Jollywood Nights' }), 'tickets'],
    [item({ provider: 'Expedia', title: 'Quarto duplo', hotelName: 'Hyatt Regency' }), 'hotel'],
    [item({ provider: 'Booking', title: 'Hospedagem 7 noites' }), 'hotel'],
    [item({ provider: 'Booking', title: 'Hotel Rosen Inn' }), 'hotel'],
    [item({ provider: 'Hertz', title: 'Aluguel de carro 7 dias' }), 'other'],
  ])('%#: classifica o item', (it, expected) => {
    expect(itemKind(it)).toBe(expected);
  });

  it('hotel ganha de ingresso quando o item traz a ficha do hotel', () => {
    const hotel = { name: 'Disney All-Star' } as QuoteItem['hotel'];
    expect(itemKind(item({ provider: 'Walt Disney World Resort', title: 'Disney All-Star', hotel }))).toBe('hotel');
  });
});

describe('groupQuoteItems', () => {
  it('põe os ingressos primeiro, depois hotel e outros, cada grupo por data', () => {
    const groups = groupQuoteItems([
      item({ title: 'Hotel Rosen', provider: 'Booking', startDate: '2027-01-01' }),
      item({ title: 'Ingresso B', startDate: '2027-01-05', endDate: '2027-01-05' }),
      item({ title: 'Transfer', provider: 'Mears', startDate: '2027-01-01' }),
      item({ title: 'Ingresso A', startDate: '2027-01-02', endDate: '2027-01-02' }),
    ]);
    expect(groups.map((g) => [g.kind, g.label, g.entries.map((e) => e.item.title)])).toEqual([
      ['tickets', 'Ingressos', ['Ingresso A', 'Ingresso B']],
      ['hotel', 'Hospedagem', ['Hotel Rosen']],
      ['other', 'Outros serviços', ['Transfer']],
    ]);
  });

  it('alterna as cores na ordem da página, atravessando os grupos', () => {
    const groups = groupQuoteItems([
      item({ title: 'Ingresso A' }),
      item({ title: 'Ingresso B' }),
      item({ title: 'Hotel Rosen', provider: 'Booking' }),
    ]);
    expect(groups.flatMap((g) => g.entries.map((e) => e.tone))).toEqual(['teal', 'violet', 'teal']);
  });

  it('não cria grupo vazio', () => {
    expect(groupQuoteItems([item()]).map((g) => g.kind)).toEqual(['tickets']);
    expect(groupQuoteItems([])).toEqual([]);
  });
});
