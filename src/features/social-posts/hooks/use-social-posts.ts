'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useOrgId } from '@/hooks/use-org-query-key';
import { getErrorMessage } from '@/lib/errors';
import { POLL_INTERVAL_MS, shouldPoll } from '../lib/post-groups';
import {
  SocialPostsForbiddenError,
  socialPostsService,
  type CreateIdeaParams,
  type SuggestParams,
  type UpdatePostParams,
} from '../services/social-posts.service';

const POSTS_KEY = 'social-posts';
const CHANNELS_KEY = 'social-posts-channels';
const MAX_RETRIES = 1;
const CHANNELS_STALE_MS = 5 * 60_000;

// Sem permissão não adianta tentar de novo: a resposta será a mesma.
const retryUnlessForbidden = (failureCount: number, error: Error) =>
  !(error instanceof SocialPostsForbiddenError) && failureCount < MAX_RETRIES;

export const isForbidden = (error: unknown): boolean => error instanceof SocialPostsForbiddenError;

/** Todos os posts (menos descartados); reconsulta a cada 4 s só enquanto algo está em andamento. */
export function useSocialPosts(enabled: boolean) {
  const orgId = useOrgId();
  return useQuery({
    queryKey: [POSTS_KEY, orgId],
    queryFn: () => socialPostsService.list(),
    enabled,
    retry: retryUnlessForbidden,
    refetchInterval: (query) => (shouldPoll(query.state.data) ? POLL_INTERVAL_MS : false),
  });
}

export function useInstagramChannels(enabled: boolean) {
  const orgId = useOrgId();
  return useQuery({
    queryKey: [CHANNELS_KEY, orgId],
    queryFn: () => socialPostsService.channels(),
    enabled,
    retry: retryUnlessForbidden,
    staleTime: CHANNELS_STALE_MS,
  });
}

/** Mutação que, ao dar certo, recarrega a lista e avisa; ao falhar, mostra a mensagem da API. */
function usePostsMutation<TVars, TResult>(
  mutationFn: (vars: TVars) => Promise<TResult>,
  messages: { success?: string; error: string },
) {
  const queryClient = useQueryClient();
  const orgId = useOrgId();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      if (messages.success) toast.success(messages.success);
      return queryClient.invalidateQueries({ queryKey: [POSTS_KEY, orgId] });
    },
    onError: (err) => toast.error(getErrorMessage(err, messages.error)),
  });
}

export function useSuggestPosts() {
  return usePostsMutation((params: SuggestParams) => socialPostsService.suggest(params), {
    success: 'Sugestões criadas. As imagens ficam prontas em instantes.',
    error: 'Não deu para sugerir posts agora.',
  });
}

export function useCreateIdea() {
  return usePostsMutation((params: CreateIdeaParams) => socialPostsService.createIdea(params), {
    success: 'Ideia criada. A imagem fica pronta em instantes.',
    error: 'Não deu para criar a ideia agora.',
  });
}

export function useUpdatePost() {
  return usePostsMutation(
    ({ id, changes }: { id: string; changes: UpdatePostParams }) => socialPostsService.update(id, changes),
    { success: 'Alterações salvas.', error: 'Não deu para salvar.' },
  );
}

export function useRegenerateImage() {
  return usePostsMutation(
    ({ id, imagePrompt }: { id: string; imagePrompt?: string }) => socialPostsService.regenerateImage(id, imagePrompt),
    { success: 'Gerando outra imagem…', error: 'Não deu para gerar outra imagem.' },
  );
}

export function useSchedulePost() {
  return usePostsMutation(
    ({ id, scheduledAt }: { id: string; scheduledAt: string }) => socialPostsService.schedule(id, scheduledAt),
    { success: 'Post agendado.', error: 'Não deu para agendar.' },
  );
}

export function useUnschedulePost() {
  return usePostsMutation((id: string) => socialPostsService.unschedule(id), {
    success: 'Post desagendado. Ele voltou para as sugestões.',
    error: 'Não deu para desagendar.',
  });
}

export function usePublishNow() {
  return usePostsMutation((id: string) => socialPostsService.publishNow(id), {
    success: 'Publicando no Instagram…',
    error: 'Não deu para publicar.',
  });
}

export function useDiscardPost() {
  return usePostsMutation((id: string) => socialPostsService.discard(id), {
    success: 'Post descartado.',
    error: 'Não deu para descartar.',
  });
}
