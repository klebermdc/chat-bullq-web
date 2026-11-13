import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/lib/api';
import { WhatsappCostsForbiddenError, whatsappCostsService } from './whatsapp-costs.service';

vi.mock('@/lib/api', () => ({ api: { get: vi.fn() } }));

const PERIOD = { from: '2026-11-01', to: '2026-11-13' };

const respondWith = (status: number, data: unknown) =>
  vi.mocked(api.get).mockResolvedValue({ status, data: { data } });

describe('whatsappCostsService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('pede os custos do período e devolve sem o envelope', async () => {
    respondWith(200, { from: '2026-11-01', channels: [] });

    const result = await whatsappCostsService.getCosts(PERIOD);

    expect(result).toEqual({ from: '2026-11-01', channels: [] });
    expect(api.get).toHaveBeenCalledWith(
      '/whatsapp-costs',
      expect.objectContaining({ params: { from: '2026-11-01', to: '2026-11-13' } }),
    );
  });

  it('pede o detalhamento do canal escolhido', async () => {
    respondWith(200, { channelId: 'ch-1' });

    await whatsappCostsService.getBreakdown('ch-1', PERIOD);

    expect(api.get).toHaveBeenCalledWith(
      '/whatsapp-costs/breakdown',
      expect.objectContaining({ params: { channelId: 'ch-1', from: '2026-11-01', to: '2026-11-13' } }),
    );
  });

  it('transforma 403 em erro de permissão reconhecível', async () => {
    respondWith(403, null);

    await expect(whatsappCostsService.getCosts(PERIOD)).rejects.toBeInstanceOf(WhatsappCostsForbiddenError);
    await expect(whatsappCostsService.getBreakdown('ch-1', PERIOD)).rejects.toBeInstanceOf(
      WhatsappCostsForbiddenError,
    );
  });

  it('aceita só 2xx e 403 sem rejeitar no axios', async () => {
    respondWith(200, {});

    await whatsappCostsService.getCosts(PERIOD);

    const config = vi.mocked(api.get).mock.calls[0][1] as { validateStatus: (s: number) => boolean };
    expect([200, 204, 403].map(config.validateStatus)).toEqual([true, true, true]);
    expect([401, 404, 500].map(config.validateStatus)).toEqual([false, false, false]);
  });
});
