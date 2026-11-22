import { beforeEach, describe, expect, it, vi } from 'vitest';

const post = vi.fn();
vi.mock('@/lib/api', () => ({ api: { post: (...args: unknown[]) => post(...args) } }));

import { COMPETITORS_TIMEOUT_MS, competitorsService } from './competitors.service';

describe('competitorsService', () => {
  beforeEach(() => post.mockReset());

  it('compara: rota, corpo, timeout longo e envelope { data }', async () => {
    // Arrange
    const result = { checkedAt: '2026-11-22T15:00:00Z', stores: [], items: [], summary: [] };
    const request = { items: [{ provider: 'Disney', title: 'Ingresso 4 dias', startDate: null, adults: 2, children: 0, total: 3000 }] };
    post.mockResolvedValue({ data: { data: result } });

    // Act
    const response = await competitorsService.compare(request);

    // Assert
    expect(response).toBe(result);
    expect(post).toHaveBeenCalledWith('/proposals/quote/competitors', request, { timeout: COMPETITORS_TIMEOUT_MS });
  });

  it('erro da API sobe para a tela tratar', async () => {
    post.mockImplementationOnce(async () => {
      throw new Error('boom');
    });
    await expect(competitorsService.compare({ items: [] })).rejects.toThrow('boom');
  });
});
