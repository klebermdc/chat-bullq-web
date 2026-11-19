import { beforeEach, describe, expect, it, vi } from 'vitest';

const post = vi.fn();
vi.mock('@/lib/api', () => ({ api: { post: (...args: unknown[]) => post(...args) } }));

import { consultCopilot } from './api';

describe('consultCopilot com imagem', () => {
  beforeEach(() => post.mockReset().mockResolvedValue({ data: { data: { reply: 'ok', suggestion: null } } }));

  it('sem imagem, manda JSON para /copilot/consult', async () => {
    await consultCopilot('oi', [], { conversationId: 'c1' });
    expect(post).toHaveBeenCalledWith('/copilot/consult', { text: 'oi', history: [], conversationId: 'c1' });
  });

  it('com imagem, manda formulário para /copilot/consult/image', async () => {
    const file = new File(['x'], 'print.png', { type: 'image/png' });
    const out = await consultCopilot('quanto deu?', [{ role: 'user', content: 'a' }], { conversationId: 'c1', messageId: 'm1' }, file);
    const [url, form, config] = post.mock.calls[0] as [string, FormData, { headers: Record<string, string> }];
    expect(config.headers['Content-Type']).toBe('multipart/form-data');
    expect(url).toBe('/copilot/consult/image');
    expect(form.get('text')).toBe('quanto deu?');
    expect(form.get('conversationId')).toBe('c1');
    expect(form.get('messageId')).toBe('m1');
    expect(JSON.parse(form.get('history') as string)).toEqual([{ role: 'user', content: 'a' }]);
    expect((form.get('image') as File).name).toBe('print.png');
    expect(out).toEqual({ reply: 'ok', suggestion: null });
  });
});
