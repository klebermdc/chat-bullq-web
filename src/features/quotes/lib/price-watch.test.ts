import { describe, expect, it } from 'vitest';
import type { CompetitorComparison } from '../types';
import { PLATFORM_LABEL, rankingRows } from './price-watch';

const RESULT: CompetitorComparison = {
  checkedAt: '2026-11-23T08:00:00Z',
  stores: [
    { id: 'a', name: 'Loja A', isEstimate: false },
    { id: 'b', name: 'Loja B', isEstimate: false },
    { id: 'o', name: 'Orange', isEstimate: true },
    { id: 'x', name: 'Sem preço', isEstimate: false },
  ],
  items: [
    {
      index: 0,
      title: 'SW',
      ourTotal: 100,
      match: { name: 'SW', days: 1 },
      reason: null,
      offers: [
        {
          storeId: 'b',
          status: 'OK',
          total: 110,
          cashTotal: null,
          maxInstallments: 10,
          isEstimate: false,
          diff: 10,
          diffPercent: 10,
        },
        {
          storeId: 'a',
          status: 'OK',
          total: 90,
          cashTotal: null,
          maxInstallments: 10,
          isEstimate: false,
          diff: -10,
          diffPercent: -10,
        },
        {
          storeId: 'o',
          status: 'OK',
          total: 50,
          cashTotal: null,
          maxInstallments: null,
          isEstimate: true,
          diff: -50,
          diffPercent: -50,
        },
        {
          storeId: 'x',
          status: 'UNAVAILABLE',
          total: null,
          cashTotal: null,
          maxInstallments: null,
          isEstimate: false,
          diff: null,
          diffPercent: null,
        },
      ],
    },
  ],
  summary: [],
};

describe('rankingRows', () => {
  it('põe a OFP entre as lojas, do mais barato ao mais caro, sem estimativa e sem quem não tem preço', () => {
    // Act
    const rows = rankingRows(RESULT.items[0], RESULT);

    // Assert
    expect(rows).toEqual([
      { name: 'Loja A', total: 90, isOurs: false },
      { name: 'OFP', total: 100, isOurs: true },
      { name: 'Loja B', total: 110, isOurs: false },
    ]);
  });

  it('com muitas lojas, mantém as mais baratas e sempre a OFP', () => {
    const offers = Array.from({ length: 20 }, (_, i) => ({
      storeId: `s${i}`,
      status: 'OK' as const,
      total: 50 + i,
      cashTotal: null,
      maxInstallments: 10,
      isEstimate: false,
      diff: 0,
      diffPercent: 0,
    }));
    const stores = offers.map((o) => ({ id: o.storeId, name: o.storeId, isEstimate: false }));
    const item = { ...RESULT.items[0], ourTotal: 200, offers };

    const rows = rankingRows(item, { ...RESULT, stores, items: [item] }, 5);

    expect(rows.map((r) => r.name)).toEqual(['s0', 's1', 's2', 's3', 's4', 'OFP']);
  });
});

describe('PLATFORM_LABEL', () => {
  it('nomeia as plataformas em português', () => {
    expect(PLATFORM_LABEL).toEqual({ JUST_TRAVEL: 'Just Travel', SUNCOAST: 'SunCoast', OTHER: 'Outras' });
  });
});
