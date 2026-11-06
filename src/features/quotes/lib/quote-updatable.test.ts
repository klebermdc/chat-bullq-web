import { describe, expect, it } from 'vitest';
import type { Proposal } from '@/features/proposals/types';
import { updatableQuote } from './quote-updatable';

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
