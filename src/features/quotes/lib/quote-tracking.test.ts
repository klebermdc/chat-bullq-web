import { describe, expect, it } from 'vitest';
import { describeQuoteTracking, latestQuote } from './quote-tracking';

const NOW = new Date('2026-10-26T20:00:00.000Z'); // 17h em Brasília

const base = {
  id: 'p1',
  kind: 'QUOTE' as const,
  createdAt: '2026-10-26T12:00:00.000Z',
  quoteUrl: 'https://cotacao.orlandofastpass.com.br/abc',
  expiresAt: '2026-10-27T21:00:00.000Z',
  viewCount: 0,
  firstViewedAt: null,
  lastViewedAt: null,
};

describe('describeQuoteTracking', () => {
  it('ainda não abriu', () => {
    expect(describeQuoteTracking(base, NOW)).toEqual({
      opened: 'ainda não abriu',
      hasOpened: false,
      expiry: 'vence 27/10, às 18h',
      isExpired: false,
      url: base.quoteUrl,
    });
  });

  it('aberta hoje: "aberta 2x · última hoje 14:32"', () => {
    const t = describeQuoteTracking(
      { ...base, viewCount: 2, lastViewedAt: '2026-10-26T17:32:00.000Z' },
      NOW,
    );

    expect(t.opened).toBe('aberta 2x · última hoje 14:32');
    expect(t.hasOpened).toBe(true);
  });

  it('aberta em outro dia mostra a data', () => {
    const t = describeQuoteTracking(
      { ...base, viewCount: 1, lastViewedAt: '2026-10-24T17:32:00.000Z' },
      NOW,
    );

    expect(t.opened).toBe('aberta 1x · última 24/10 14:32');
  });

  it('vencida', () => {
    const t = describeQuoteTracking({ ...base, expiresAt: '2026-10-26T19:00:00.000Z' }, NOW);

    expect(t.expiry).toBe('vencida');
    expect(t.isExpired).toBe(true);
  });

  it('API antiga sem os campos: trata como não aberta e sem validade', () => {
    const t = describeQuoteTracking({ id: 'p1', kind: 'QUOTE', createdAt: base.createdAt }, NOW);

    expect(t).toEqual({ opened: 'ainda não abriu', hasOpened: false, expiry: null, isExpired: false, url: null });
  });
});

describe('latestQuote', () => {
  it('pega a cotação mais recente da lista (já vem desc)', () => {
    const list = [
      { ...base, id: 'texto', kind: 'OTHER' as const },
      { ...base, id: 'q2' },
      { ...base, id: 'q1' },
    ];

    expect(latestQuote(list)?.id).toBe('q2');
  });

  it('sem cotação devolve null', () => {
    expect(latestQuote([{ ...base, kind: 'PARKS' as const }])).toBeNull();
    expect(latestQuote(undefined)).toBeNull();
  });
});
