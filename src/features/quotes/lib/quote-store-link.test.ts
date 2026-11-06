import { describe, expect, it } from 'vitest';
import { savedStoreUrl } from './quote-store-link';

describe('savedStoreUrl', () => {
  it('devolve o link http(s) gravado na cotação', () => {
    expect(savedStoreUrl({ quote: { storeUrl: 'https://loja.exemplo.com/c/1' } as never })).toBe('https://loja.exemplo.com/c/1');
  });

  it('sem link, cotação antiga ou proposta sem details: null', () => {
    expect(savedStoreUrl(null)).toBeNull();
    expect(savedStoreUrl({})).toBeNull();
    expect(savedStoreUrl({ quote: { storeUrl: null } as never })).toBeNull();
  });

  it('nunca devolve link que não seja http(s) (não vira href perigoso)', () => {
    expect(savedStoreUrl({ quote: { storeUrl: 'javascript:alert(1)' } as never })).toBeNull();
  });
});
