import { beforeEach, describe, expect, it, vi } from 'vitest';
import { documentTemplatesService } from './document-templates.service';

const { post } = vi.hoisted(() => ({ post: vi.fn() }));

vi.mock('@/lib/api', () => ({ api: { post, get: vi.fn(), put: vi.fn() } }));

beforeEach(() => {
  post.mockReset();
});

describe('documentTemplatesService.requestClientData', () => {
  it('returns the message text on success', async () => {
    post.mockResolvedValueOnce({ status: 201, data: { data: { text: 'Oi', fields: ['[CPF]'] } } });
    await expect(documentTemplatesService.requestClientData('c1', 't1', false)).resolves.toEqual({
      ok: true,
      text: 'Oi',
      fields: ['[CPF]'],
      send: null,
    });
    expect(post).toHaveBeenCalledWith('/conversations/c1/contracts/data-request', { templateId: 't1', send: false }, expect.any(Object));
  });

  it('turns 422 into a nothing-missing outcome', async () => {
    post.mockResolvedValueOnce({ status: 422, data: { message: 'Já temos todos os dados do cliente para este modelo.' } });
    await expect(documentTemplatesService.requestClientData('c1', 't1', true)).resolves.toEqual({
      ok: false,
      message: 'Já temos todos os dados do cliente para este modelo.',
    });
  });

  it('throws a Portuguese message on 429', async () => {
    post.mockResolvedValueOnce({ status: 429, data: { message: 'ThrottlerException: Too Many Requests' } });
    await expect(documentTemplatesService.requestClientData('c1', 't1', true)).rejects.toThrow(
      'Muitas solicitações seguidas. Aguarde um minuto e tente de novo.',
    );
  });

  it('accepts 429 in validateStatus so the interceptor does not swallow it', async () => {
    post.mockResolvedValueOnce({ status: 201, data: { data: { text: 'Oi' } } });
    await documentTemplatesService.requestClientData('c1', 't1', false);
    const { validateStatus } = post.mock.calls[0][2] as { validateStatus: (s: number) => boolean };
    expect([200, 422, 429].map(validateStatus)).toEqual([true, true, true]);
    expect(validateStatus(500)).toBe(false);
  });
});

describe('documentTemplatesService.aiFill', () => {
  it('throws a Portuguese message on 429', async () => {
    post.mockResolvedValueOnce({ status: 429, data: {} });
    await expect(documentTemplatesService.aiFill('t1', { useConversation: true })).rejects.toThrow('Espere um minuto');
  });
});
