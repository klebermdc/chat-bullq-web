import { describe, expect, it } from 'vitest';
import type { CompetitorComparison, CompetitorOffer } from '../types';
import {
  buildCompetitorRequest,
  competitorOfferTone,
  competitorRequestKey,
  competitorStoreName,
  formatCompetitorDiff,
  hasCompetitorEstimates,
} from './competitor-compare';
import { emptyDraftItem, type QuoteDraftItem } from './quote-draft';

const item = (patch: Partial<QuoteDraftItem> = {}): QuoteDraftItem => ({
  ...emptyDraftItem('k1'),
  provider: '  Disney ',
  title: ' Ingresso 4 dias ',
  startDate: '2026-12-10',
  adults: '2',
  children: '1',
  total: '3.000,50',
  ...patch,
});

const offer = (patch: Partial<CompetitorOffer> = {}): CompetitorOffer => ({
  storeId: 's1',
  status: 'OK',
  total: 2900,
  cashTotal: null,
  maxInstallments: null,
  isEstimate: false,
  diff: -100.5,
  diffPercent: -3.35,
  ...patch,
});

const text = (s: string | null) => s?.replace(/\s/g, ' ');

describe('buildCompetitorRequest', () => {
  it('apara textos e converte pessoas e total em número', () => {
    // Act
    const request = buildCompetitorRequest({ items: [item()] });

    // Assert
    expect(request).toEqual({
      items: [{ provider: 'Disney', title: 'Ingresso 4 dias', startDate: '2026-12-10', adults: 2, children: 1, total: 3000.5 }],
    });
  });

  it('data vazia vira null; pessoas e total inválidos viram 0', () => {
    const request = buildCompetitorRequest({ items: [item({ startDate: '', adults: 'dois', children: '-1', total: 'abc' })] });
    expect(request.items[0]).toMatchObject({ startDate: null, adults: 0, children: 0, total: 0 });
  });

  it('não muda o rascunho', () => {
    const draft = { items: [item()] };
    const before = JSON.stringify(draft);
    buildCompetitorRequest(draft);
    expect(JSON.stringify(draft)).toBe(before);
  });
});

describe('competitorRequestKey', () => {
  it('é igual para o mesmo pedido, mesmo com espaços diferentes no rascunho', () => {
    const a = competitorRequestKey(buildCompetitorRequest({ items: [item()] }));
    const b = competitorRequestKey(buildCompetitorRequest({ items: [item({ title: 'Ingresso 4 dias' })] }));
    expect(a).toBe(b);
  });

  it('muda quando um item muda', () => {
    const a = competitorRequestKey(buildCompetitorRequest({ items: [item()] }));
    const b = competitorRequestKey(buildCompetitorRequest({ items: [item({ adults: '3' })] }));
    expect(a).not.toBe(b);
  });

  it('ignora o que não vai na comparação (descrição)', () => {
    const a = competitorRequestKey(buildCompetitorRequest({ items: [item()] }));
    const b = competitorRequestKey(buildCompetitorRequest({ items: [item({ description: 'outra' })] }));
    expect(a).toBe(b);
  });
});

describe('competitorOfferTone', () => {
  it('não pinta o preço "a partir de" como mais barato', () => {
    expect(competitorOfferTone(offer({ isEstimate: true, diff: -50 }))).toBe('neutral');
  });

  it('eles mais baratos = theyCheaper', () => {
    expect(competitorOfferTone(offer())).toBe('theyCheaper');
  });

  it('nós mais baratos = weCheaper', () => {
    expect(competitorOfferTone(offer({ diff: 50 }))).toBe('weCheaper');
  });

  it('sem preço, empate ou status não OK = neutral', () => {
    expect(competitorOfferTone(offer({ diff: null }))).toBe('neutral');
    expect(competitorOfferTone(offer({ diff: 0 }))).toBe('neutral');
    expect(competitorOfferTone(offer({ status: 'UNAVAILABLE' }))).toBe('neutral');
  });
});

describe('formatCompetitorDiff', () => {
  it('mais barato com valor e porcentagem', () => {
    expect(text(formatCompetitorDiff(offer(), 'BRL'))).toBe('R$ 100,50 mais barato (3,4%)');
  });

  it('mais caro', () => {
    expect(text(formatCompetitorDiff(offer({ diff: 200, diffPercent: 6.7 }), 'BRL'))).toBe('R$ 200,00 mais caro (6,7%)');
  });

  it('sem porcentagem, só o valor', () => {
    expect(text(formatCompetitorDiff(offer({ diffPercent: null }), 'BRL'))).toBe('R$ 100,50 mais barato');
  });

  it('empate e sem diferença', () => {
    expect(formatCompetitorDiff(offer({ diff: 0 }), 'BRL')).toBe('mesmo preço');
    expect(formatCompetitorDiff(offer({ diff: null }), 'BRL')).toBeNull();
    expect(formatCompetitorDiff(offer({ status: 'ERROR' }), 'BRL')).toBeNull();
  });
});

describe('estimativas e lojas', () => {
  const result: CompetitorComparison = {
    checkedAt: '2026-11-22T15:00:00Z',
    stores: [{ id: 's1', name: 'Loja A', isEstimate: false }],
    items: [{ index: 0, title: 'X', ourTotal: 3000, match: null, reason: null, offers: [offer()] }],
    summary: [],
  };

  it('sem "a partir de", não há estimativa', () => {
    expect(hasCompetitorEstimates(result)).toBe(false);
  });

  it('com "a partir de" numa oferta OK, há estimativa', () => {
    const items = [{ ...result.items[0], offers: [offer({ isEstimate: true })] }];
    expect(hasCompetitorEstimates({ ...result, items })).toBe(true);
  });

  it('nome da loja pelo id, ou o próprio id se a loja sumiu', () => {
    expect(competitorStoreName(result, 's1')).toBe('Loja A');
    expect(competitorStoreName(result, 's9')).toBe('s9');
  });
});
