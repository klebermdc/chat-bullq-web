import { describe, expect, it } from 'vitest';
import { buildTickets, presentQuote, sortItemsByDate } from './quote-blocks';
import type { PublicQuoteView, QuoteItem } from '../types';

const NOW = new Date('2026-10-26T15:00:00.000Z');

function item(over: Partial<QuoteItem> = {}): QuoteItem {
  return {
    provider: 'Universal Orlando Resort',
    title: 'Ingresso 2 Parques',
    startDate: '2027-01-01',
    endDate: '2027-01-01',
    description: null,
    adults: 3,
    children: 1,
    priceAdult: null,
    priceChild: null,
    total: 9289.31,
    cancellationPolicy: null,
    ...over,
  };
}

function view(over: Partial<PublicQuoteView> = {}, quoteOver = {}): PublicQuoteView {
  return {
    status: 'ACTIVE',
    code: '8K2Q1Z',
    customerName: 'Maria Souza',
    seller: { name: 'Ana Paula', whatsapp: '5511988887777' },
    company: null,
    createdAt: '2026-10-26T12:00:00.000Z',
    expiresAt: '2026-10-27T21:00:00.000Z',
    quote: {
      items: [item()],
      currency: 'BRL',
      total: 9289.31,
      pixTotal: null,
      installments: null,
      notes: null,
      ...quoteOver,
    },
    ...over,
  };
}

describe('sortItemsByDate', () => {
  it('ordena por data e deixa os sem data no fim, sem mexer no original', () => {
    const items = [
      item({ title: 'C', startDate: null, endDate: null }),
      item({ title: 'B', startDate: '2027-01-05' }),
      item({ title: 'A', startDate: '2027-01-01' }),
    ];
    const sorted = sortItemsByDate(items);

    expect(sorted.map((i) => i.title)).toEqual(['A', 'B', 'C']);
    expect(items[0].title).toBe('C');
  });
});

describe('buildTickets', () => {
  it('bilhetes por data, alternando teal/violeta', () => {
    const tickets = buildTickets([item({ title: 'B', startDate: '2027-01-05', endDate: '2027-01-05' }), item({ title: 'A' })]);

    expect(tickets.map((t) => [t.item.title, t.tone])).toEqual([
      ['A', 'teal'],
      ['B', 'violet'],
    ]);
  });
});

describe('presentQuote', () => {
  it('cotação mínima: some tudo o que não tem dado', () => {
    const p = presentQuote(view(), NOW);

    expect(p.isExpired).toBe(false);
    expect(p.showPrices).toBe(true);
    expect(p.payment).toBeNull();
    expect(p.notes).toBeNull();
    expect(p.contact).not.toBeNull();
  });

  it('countdown até o primeiro dia; some se já passou ou não há data', () => {
    expect(presentQuote(view(), NOW).countdownDays).toBe(67);
    expect(
      presentQuote(view({}, { items: [item({ startDate: '2026-10-01', endDate: '2026-10-01' })] }), NOW)
        .countdownDays,
    ).toBeNull();
    expect(
      presentQuote(view({}, { items: [item({ startDate: null, endDate: null })] }), NOW).countdownDays,
    ).toBeNull();
  });

  it('pagamento aparece com Pix e/ou parcelas', () => {
    const p = presentQuote(view({}, { pixTotal: 9000, installments: { count: 10, value: 928.93 } }), NOW);

    expect(p.payment).toEqual({ pixTotal: 9000, installments: { count: 10, value: 928.93 } });
  });

  it('viajantes = máximo de adultos e de crianças entre os itens', () => {
    const p = presentQuote(
      view({}, { items: [item({ adults: 2, children: 0 }), item({ adults: 1, children: 2 })] }),
      NOW,
    );

    expect(p.people).toEqual({ adults: 2, children: 2 });
  });

  it('vencida: sem preços, sem pagamento, sem countdown', () => {
    const p = presentQuote(
      view({ status: 'EXPIRED' }, { pixTotal: 9000, installments: { count: 10, value: 900 } }),
      NOW,
    );

    expect(p.isExpired).toBe(true);
    expect(p.showPrices).toBe(false);
    expect(p.payment).toBeNull();
    expect(p.countdownDays).toBeNull();
  });

  it('sem whatsapp do vendedor: sem links de contato', () => {
    const p = presentQuote(view({ seller: { name: 'Ana', whatsapp: null } }), NOW);

    expect(p.contact).toBeNull();
  });

  it('observação em branco some', () => {
    expect(presentQuote(view({}, { notes: '  ' }), NOW).notes).toBeNull();
    expect(presentQuote(view({}, { notes: ' Hotel incluso ' }), NOW).notes).toBe('Hotel incluso');
  });

  it('intervalo total da viagem vai do menor início ao maior fim', () => {
    const p = presentQuote(
      view({}, {
        items: [
          item({ startDate: '2027-01-05', endDate: '2027-01-06' }),
          item({ startDate: '2027-01-01', endDate: '2027-01-01' }),
        ],
      }),
      NOW,
    );

    expect(p.tripRange).toEqual({ startDate: '2027-01-01', endDate: '2027-01-06' });
  });
});
