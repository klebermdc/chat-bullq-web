// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SocialPost } from '../services/social-posts.service';
import { ImageTextFields } from './image-text-fields';
import { PostImage } from './post-image';

const { applyImageText, toastError } = vi.hoisted(() => ({ applyImageText: vi.fn(), toastError: vi.fn() }));
vi.mock('../services/social-posts.service', async (importOriginal) => {
  const original = await importOriginal<typeof import('../services/social-posts.service')>();
  return { ...original, socialPostsService: { ...original.socialPostsService, applyImageText } };
});
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: toastError } }));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const POST: SocialPost = {
  id: 'p1',
  channelId: 'ig1',
  status: 'SUGGESTED',
  imageStatus: 'READY',
  topic: 'Fila do Epcot',
  caption: 'Dicas',
  imagePrompt: 'castelo',
  imageUrl: 'https://img.example/p1.png',
  commentKeyword: 'GUIA',
  headline: 'Fuja da fila',
  subline: 'Comenta GUIA',
  scheduledAt: null,
  publishedAt: null,
  permalink: null,
  error: null,
  createdAt: '2026-11-27T10:00:00.000Z',
  updatedAt: '2026-11-27T10:00:00.000Z',
};

let container: HTMLDivElement;
let root: Root;

async function render(post: SocialPost) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <PostImage post={post} />
        <ImageTextFields post={post} />
      </QueryClientProvider>,
    );
  });
}

/** Digita como o usuário: o React só vê a mudança pelo setter nativo + evento input. */
async function type(id: string, value: string) {
  const input = container.querySelector<HTMLInputElement>(`#${id}`);
  if (!input) throw new Error(`campo ${id} não encontrado`);
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  await act(async () => {
    setter?.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

const applyButton = () =>
  Array.from(container.querySelectorAll('button')).find((b) => b.textContent?.includes('Aplicar na imagem'));

async function clickApply() {
  await act(async () => {
    applyButton()?.click();
  });
  // O React Query avisa os observadores no próximo tick.
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

beforeEach(() => {
  applyImageText.mockReset();
  toastError.mockReset();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe('ImageTextFields', () => {
  it('manda título e subtítulo editados, sem espaços nas pontas', async () => {
    // Arrange
    applyImageText.mockResolvedValue({ ...POST, headline: 'Disney sem fila', imageUrl: 'nova.png' });
    await render(POST);

    // Act
    await type('headline-p1', '  Disney sem fila ');
    expect(container.textContent).toContain('18/32');
    await clickApply();

    // Assert
    expect(applyImageText).toHaveBeenCalledWith('p1', { headline: 'Disney sem fila', subline: 'Comenta GUIA' });
  });

  it('campos vazios viram string vazia (imagem sem texto)', async () => {
    applyImageText.mockResolvedValue({ ...POST, headline: null, subline: null });
    await render({ ...POST, headline: null, subline: null });

    await clickApply();

    expect(applyImageText).toHaveBeenCalledWith('p1', { headline: '', subline: '' });
  });

  it('mostra o aviso sobre a imagem enquanto redesenha', async () => {
    applyImageText.mockReturnValue(new Promise(() => {}));
    await render(POST);

    await clickApply();

    expect(container.textContent).toContain('Escrevendo o texto na imagem…');
  });

  it('post antigo sem fundo: a mensagem da API vai para o aviso', async () => {
    applyImageText.mockRejectedValue(new Error('Gere outra imagem para poder escrever o texto'));
    await render(POST);

    await clickApply();

    expect(toastError).toHaveBeenCalledWith('Gere outra imagem para poder escrever o texto');
  });

  it('imagem ainda sendo gerada trava o botão', async () => {
    await render({ ...POST, imageStatus: 'PENDING', imageUrl: null });

    expect(applyButton()?.disabled).toBe(true);
  });
});
