import { renderToStaticMarkup } from 'react-dom/server';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import type { SocialPost } from '../services/social-posts.service';
import { PostCard } from './post-card';
import { PostsBoard } from './posts-board';

const base: SocialPost = {
  id: 'p1',
  channelId: 'ig1',
  status: 'SUGGESTED',
  imageStatus: 'READY',
  topic: 'Fila do Epcot',
  caption: 'Dicas para fugir da fila',
  imagePrompt: 'castelo ao pôr do sol',
  imageUrl: 'https://img.example/p1.png',
  commentKeyword: 'GUIAMENTO',
  scheduledAt: '2026-11-28T13:00:00.000Z',
  publishedAt: null,
  permalink: null,
  error: null,
  createdAt: '2026-11-27T10:00:00.000Z',
  updatedAt: '2026-11-27T10:00:00.000Z',
};

const wrap = (node: React.ReactNode) =>
  renderToStaticMarkup(<QueryClientProvider client={new QueryClient()}>{node}</QueryClientProvider>);

const card = (post: SocialPost) => wrap(<PostCard post={post} username="orlandofastpass" />);

describe('PostCard', () => {
  it('sugestão pronta: legenda editável, palavra, data em Brasília e ações liberadas', () => {
    const out = card(base);
    expect(out).toContain('@orlandofastpass');
    expect(out).toContain('Dicas para fugir da fila');
    expect(out).toContain('Comenta GUIAMENTO');
    expect(out).toContain('value="2026-11-28T10:00"');
    expect(out).toContain('Descrição da imagem');
    for (const acao of ['Agendar', 'Publicar agora', 'Descartar']) expect(out).toContain(acao);
    expect(out).not.toContain('liberam quando a imagem');
  });

  it('imagem sendo gerada: mostra o aviso e trava agendar e publicar', () => {
    const out = card({ ...base, imageStatus: 'PENDING', imageUrl: null });
    expect(out).toContain('Gerando imagem…');
    expect(out).toContain('Agendar e publicar liberam quando a imagem ficar pronta.');
  });

  it('imagem que falhou oferece tentar de novo', () => {
    expect(card({ ...base, imageStatus: 'FAILED', imageUrl: null })).toContain('Tentar de novo');
  });

  it('post com falha mostra o erro e permite publicar de novo', () => {
    const out = card({ ...base, status: 'FAILED', error: 'Token do Instagram vencido.' });
    expect(out).toContain('Token do Instagram vencido.');
    expect(out).toContain('Publicar de novo');
    expect(out).toContain('Agendar');
  });

  it('agendado mostra quando sai e permite desagendar', () => {
    const out = card({ ...base, status: 'SCHEDULED' });
    expect(out).toContain('Sai sáb., 28/11 às 10:00');
    expect(out).toContain('Desagendar');
    expect(out).not.toContain('Publicar agora');
    expect(out).not.toContain('Descrição da imagem');
  });

  it('publicado é só leitura e tem link para o Instagram', () => {
    const out = card({
      ...base,
      status: 'PUBLISHED',
      publishedAt: '2026-11-28T13:00:00.000Z',
      permalink: 'https://instagram.com/p/abc',
    });
    expect(out).toContain('Ver no Instagram');
    expect(out).toContain('href="https://instagram.com/p/abc"');
    expect(out).not.toContain('<textarea');
    expect(out).not.toContain('Descartar');
  });
});

describe('PostsBoard', () => {
  const board = (posts: SocialPost[], tab: 'suggestions' | 'scheduled' | 'published') =>
    wrap(
      <PostsBoard
        posts={posts}
        channels={[{ id: 'ig1', name: 'OFP', username: 'orlandofastpass' }]}
        channelId={null}
        tab={tab}
        onTabChange={() => {}}
        onSuggest={() => {}}
      />,
    );

  it('sem sugestões orienta a clicar em Sugerir posts', () => {
    const out = board([], 'suggestions');
    expect(out).toContain('Nenhuma sugestão ainda');
    expect(out).toContain('Clique em Sugerir posts');
  });

  it('agendados aparecem separados por dia', () => {
    const out = board([{ ...base, status: 'SCHEDULED' }], 'scheduled');
    expect(out).toContain('sábado, 28/11');
  });
});
