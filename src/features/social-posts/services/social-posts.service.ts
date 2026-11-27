import { api } from '@/lib/api';

/**
 * Contrato de `/social-posts` (só dono e administrador). A IA sugere posts do
 * Instagram (legenda + imagem gerada) e a gestão aprova, agenda ou publica.
 * Datas chegam e vão em ISO UTC.
 */

export type SocialPostStatus = 'SUGGESTED' | 'SCHEDULED' | 'PUBLISHING' | 'PUBLISHED' | 'FAILED' | 'DISCARDED';
export type SocialPostImageStatus = 'PENDING' | 'READY' | 'FAILED';

export interface SocialPost {
  id: string;
  channelId: string;
  status: SocialPostStatus;
  imageStatus: SocialPostImageStatus;
  topic: string;
  caption: string;
  imagePrompt: string;
  imageUrl: string | null;
  commentKeyword: string | null;
  /** Título escrito por cima da imagem; null = imagem sem texto. */
  headline: string | null;
  /** Subtítulo da imagem, normalmente "Comenta GUIA". */
  subline: string | null;
  scheduledAt: string | null;
  publishedAt: string | null;
  permalink: string | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InstagramChannel {
  id: string;
  name: string;
  username: string;
}

export interface SuggestParams {
  channelId?: string;
  /** 1 a 7. */
  days?: number;
  perDay?: 1 | 2;
}

export interface CreateIdeaParams {
  channelId?: string;
  topic: string;
}

export interface UpdatePostParams {
  caption?: string;
  imagePrompt?: string;
  commentKeyword?: string | null;
  scheduledAt?: string | null;
  /** String vazia tira o texto da imagem. A API redesenha e devolve `imageUrl` nova. */
  headline?: string;
  subline?: string;
}

export interface ImageTextParams {
  headline: string;
  subline: string;
}

const HTTP_FORBIDDEN = 403;
/** A IA escreve legenda e prompt na hora: bem mais que os 15 s padrão do cliente. */
const AI_TIMEOUT_MS = 120_000;

/**
 * O interceptor de `lib/api.ts` rejeita sem o status, então o 403 é aceito
 * aqui e vira este erro, que a tela reconhece com `instanceof`.
 */
export class SocialPostsForbiddenError extends Error {
  constructor() {
    super('Só o dono e os administradores podem ver as publicações.');
    this.name = 'SocialPostsForbiddenError';
  }
}

const acceptForbidden = {
  validateStatus: (status: number) => (status >= 200 && status < 300) || status === HTTP_FORBIDDEN,
};

async function getManagerOnly<T>(url: string, params?: Record<string, string>): Promise<T> {
  const response = await api.get(url, { params, ...acceptForbidden });
  if (response.status === HTTP_FORBIDDEN) throw new SocialPostsForbiddenError();
  return response.data.data as T;
}

async function post<T>(url: string, body: unknown = {}, timeout?: number): Promise<T> {
  const response = await api.post(url, body, timeout ? { timeout } : undefined);
  return response.data.data as T;
}

export const socialPostsService = {
  /** Sem status a API devolve tudo menos os descartados. */
  list(statuses?: ReadonlyArray<SocialPostStatus>): Promise<SocialPost[]> {
    const params = statuses && statuses.length > 0 ? { status: statuses.join(',') } : undefined;
    return getManagerOnly<SocialPost[]>('/social-posts', params);
  },
  channels(): Promise<InstagramChannel[]> {
    return getManagerOnly<InstagramChannel[]>('/social-posts/channels');
  },
  suggest(params: SuggestParams): Promise<SocialPost[]> {
    return post<SocialPost[]>('/social-posts/suggest', params, AI_TIMEOUT_MS);
  },
  createIdea(params: CreateIdeaParams): Promise<SocialPost> {
    return post<SocialPost>('/social-posts', params, AI_TIMEOUT_MS);
  },
  async update(id: string, changes: UpdatePostParams): Promise<SocialPost> {
    const response = await api.patch(`/social-posts/${id}`, changes);
    return response.data.data as SocialPost;
  },
  /** Redesenha o texto sobre a imagem; post antigo, sem fundo guardado, responde 400. */
  async applyImageText(id: string, { headline, subline }: ImageTextParams): Promise<SocialPost> {
    const response = await api.patch(`/social-posts/${id}`, { headline, subline });
    return response.data.data as SocialPost;
  },
  regenerateImage(id: string, imagePrompt?: string): Promise<SocialPost> {
    return post<SocialPost>(`/social-posts/${id}/regenerate-image`, imagePrompt ? { imagePrompt } : {});
  },
  schedule(id: string, scheduledAt: string): Promise<SocialPost> {
    return post<SocialPost>(`/social-posts/${id}/schedule`, { scheduledAt });
  },
  unschedule(id: string): Promise<SocialPost> {
    return post<SocialPost>(`/social-posts/${id}/unschedule`);
  },
  publishNow(id: string): Promise<SocialPost> {
    return post<SocialPost>(`/social-posts/${id}/publish-now`);
  },
  discard(id: string): Promise<SocialPost> {
    return post<SocialPost>(`/social-posts/${id}/discard`);
  },
};
