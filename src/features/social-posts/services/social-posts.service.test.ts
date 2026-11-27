import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/lib/api';
import { SocialPostsForbiddenError, socialPostsService } from './social-posts.service';

vi.mock('@/lib/api', () => ({ api: { get: vi.fn(), post: vi.fn(), patch: vi.fn() } }));

const okGet = (status: number, data: unknown) => vi.mocked(api.get).mockResolvedValue({ status, data: { data } });
const okPost = (data: unknown) => vi.mocked(api.post).mockResolvedValue({ status: 200, data: { data } });

describe('socialPostsService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('lista os posts sem o envelope e junta os status com vírgula', async () => {
    okGet(200, [{ id: 'p1' }]);

    const result = await socialPostsService.list(['SUGGESTED', 'FAILED']);

    expect(result).toEqual([{ id: 'p1' }]);
    expect(api.get).toHaveBeenCalledWith(
      '/social-posts',
      expect.objectContaining({ params: { status: 'SUGGESTED,FAILED' } }),
    );
  });

  it('sem status não manda o parâmetro', async () => {
    okGet(200, []);

    await socialPostsService.list();

    expect(api.get).toHaveBeenCalledWith('/social-posts', expect.objectContaining({ params: undefined }));
  });

  it('transforma 403 em erro de permissão reconhecível', async () => {
    okGet(403, null);

    await expect(socialPostsService.list()).rejects.toBeInstanceOf(SocialPostsForbiddenError);
    await expect(socialPostsService.channels()).rejects.toBeInstanceOf(SocialPostsForbiddenError);
  });

  it('pede sugestões com prazo maior, porque a IA escreve na hora', async () => {
    okPost([]);

    await socialPostsService.suggest({ channelId: 'ig1', days: 3, perDay: 2 });

    expect(api.post).toHaveBeenCalledWith(
      '/social-posts/suggest',
      { channelId: 'ig1', days: 3, perDay: 2 },
      { timeout: 120_000 },
    );
  });

  it('agenda com a data em ISO e regenera a imagem com o prompt novo', async () => {
    okPost({ id: 'p1' });

    await socialPostsService.schedule('p1', '2026-11-28T13:00:00.000Z');
    await socialPostsService.regenerateImage('p1', 'castelo ao pôr do sol');
    await socialPostsService.regenerateImage('p1');

    expect(api.post).toHaveBeenNthCalledWith(
      1,
      '/social-posts/p1/schedule',
      { scheduledAt: '2026-11-28T13:00:00.000Z' },
      undefined,
    );
    expect(api.post).toHaveBeenNthCalledWith(
      2,
      '/social-posts/p1/regenerate-image',
      { imagePrompt: 'castelo ao pôr do sol' },
      undefined,
    );
    expect(api.post).toHaveBeenNthCalledWith(3, '/social-posts/p1/regenerate-image', {}, undefined);
  });

  it('edita com PATCH só os campos enviados', async () => {
    vi.mocked(api.patch).mockResolvedValue({ status: 200, data: { data: { id: 'p1' } } });

    await socialPostsService.update('p1', { caption: 'nova' });

    expect(api.patch).toHaveBeenCalledWith('/social-posts/p1', { caption: 'nova' });
  });

  it('escreve o texto na imagem com PATCH só de headline e subline', async () => {
    vi.mocked(api.patch).mockResolvedValue({ status: 200, data: { data: { id: 'p1', imageUrl: 'nova.png' } } });

    const result = await socialPostsService.applyImageText('p1', { headline: 'Fuja da fila', subline: '' });

    expect(api.patch).toHaveBeenCalledWith('/social-posts/p1', { headline: 'Fuja da fila', subline: '' });
    expect(result).toEqual({ id: 'p1', imageUrl: 'nova.png' });
  });
});
