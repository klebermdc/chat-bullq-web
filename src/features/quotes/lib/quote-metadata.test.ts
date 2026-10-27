import { describe, expect, it } from 'vitest';
import { quoteMetaDescription, quoteMetaTitle } from './quote-metadata';
import type { PublicQuoteView } from '../types';

const VIEW: PublicQuoteView = {
  status: 'ACTIVE',
  code: '8K2Q1Z',
  customerName: 'mariana souza',
  seller: { name: 'Ana', whatsapp: null },
  company: null,
  createdAt: '2026-10-26T12:00:00.000Z',
  expiresAt: '2026-10-28T21:00:00.000Z',
  quote: {
    currency: 'BRL',
    total: 100,
    pixTotal: null,
    installments: null,
    notes: null,
    items: [
      { provider: 'A', title: 'a', startDate: '2027-01-01', endDate: '2027-01-01', description: null, adults: 1, children: 0, priceAdult: null, priceChild: null, total: 50, cancellationPolicy: null },
      { provider: 'B', title: 'b', startDate: '2027-01-05', endDate: '2027-01-06', description: null, adults: 1, children: 0, priceAdult: null, priceChild: null, total: 50, cancellationPolicy: null },
    ],
  },
};

describe('quoteMetaTitle', () => {
  it('usa o primeiro nome do cliente', () => {
    expect(quoteMetaTitle(VIEW)).toBe('Cotação para Mariana · Orlando Fast Pass');
  });

  it('sem nome', () => {
    expect(quoteMetaTitle({ ...VIEW, customerName: null })).toBe('Sua cotação · Orlando Fast Pass');
  });
});

describe('quoteMetaDescription', () => {
  it('itens · datas · validade', () => {
    expect(quoteMetaDescription(VIEW)).toBe('2 itens · 1 a 6 jan · válida até 28/10 18:00');
  });

  it('sem datas e vencida', () => {
    const items = [{ ...VIEW.quote.items[0], startDate: null, endDate: null }];
    expect(quoteMetaDescription({ ...VIEW, status: 'EXPIRED', quote: { ...VIEW.quote, items } })).toBe(
      '1 item · cotação vencida',
    );
  });
});
