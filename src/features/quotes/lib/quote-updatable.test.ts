import { describe, expect, it } from 'vitest';
import type { Proposal } from '@/features/proposals/types';
import { replaceItemsFromPrint, updatableQuote } from './quote-updatable';

const item = { provider: 'Universal', title: 'Ingresso', startDate: null, endDate: null, description: null, adults: 2, children: 0, priceAdult: null, priceChild: null, total: 10, cancellationPolicy: null };
const quote = (id: string, items = [item]) =>
  ({ id, kind: 'QUOTE', details: { quote: { items, currency: 'BRL', total: 10, pixTotal: null, installments: null, notes: null } } }) as unknown as Proposal;

describe('updatableQuote', () => {
  it('devolve a cotação mais recente da conversa quando ela tem itens gravados', () => {
    expect(updatableQuote([quote('q2'), quote('q1')])?.id).toBe('q2');
  });

  it('ignora propostas que não são cotação por link', () => {
    const other = { id: 'p1', kind: 'OTHER', details: null } as unknown as Proposal;
    expect(updatableQuote([other])).toBeNull();
  });

  it('não oferece atualizar cotação antiga sem itens gravados', () => {
    expect(updatableQuote([quote('q1', [])])).toBeNull();
  });

  it('sem lista ainda (carregando), não oferece nada', () => {
    expect(updatableQuote(undefined)).toBeNull();
  });
});

describe('replaceItemsFromPrint', () => {
  const saved = {
    preview: true as const,
    customerName: 'Rafa',
    quote: { items: [item], currency: 'BRL', total: 10, pixTotal: 9, installments: null, notes: 'Obs antiga', storeUrl: 'https://loja/1' },
  };
  const fresh = {
    preview: true as const,
    customerName: 'RAFAEL CABRERA',
    quote: { items: [{ ...item, title: 'Novo' }], currency: 'BRL', total: 50, pixTotal: 45, installments: null, notes: null },
  };

  it('troca itens e valores pelos do print novo', () => {
    const out = replaceItemsFromPrint(saved as never, fresh as never);
    expect(out.quote.items.map((i) => i.title)).toEqual(['Novo']);
    expect(out.quote.total).toBe(50);
    expect(out.quote.pixTotal).toBe(45);
  });

  it('mantém o nome do cliente, a observação e o link da loja da cotação enviada', () => {
    const out = replaceItemsFromPrint(saved as never, fresh as never);
    expect(out.customerName).toBe('Rafa');
    expect(out.quote.notes).toBe('Obs antiga');
    expect(out.quote.storeUrl).toBe('https://loja/1');
  });
});
