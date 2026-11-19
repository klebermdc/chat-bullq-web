import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api', () => ({
  api: { get: vi.fn(async () => ({ data: { data: { enabled: true, rates: [] } } })) },
}));

import { exchangeRatesService } from './service';

describe('exchangeRatesService.list', () => {
  it('desembrulha o envelope { data } da API', async () => {
    expect(await exchangeRatesService.list()).toEqual({ enabled: true, rates: [] });
  });
});
