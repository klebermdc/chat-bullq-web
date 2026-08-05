'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { emailApi, AudienceFilter, SubscriberStatus } from '@/lib/email-api';
import { useDebouncedValue } from './use-debounced-value';

export function useSubscribers(status?: SubscriberStatus, page = 1) {
  return useQuery({
    queryKey: ['email', 'subscribers', status ?? 'all', page],
    queryFn: () => emailApi.listSubscribers(status, page),
  });
}

export function useImport() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['email', 'subscribers'] });
  return {
    contacts: useMutation({ mutationFn: emailApi.importContacts, onSuccess: invalidate }),
    orders: useMutation({ mutationFn: emailApi.importOrders, onSuccess: invalidate }),
    csv: useMutation({ mutationFn: emailApi.importCsv, onSuccess: invalidate }),
  };
}

export function useCampaigns(page = 1) {
  return useQuery({
    queryKey: ['email', 'campaigns', page],
    queryFn: () => emailApi.listCampaigns(page),
  });
}

export function useCampaign(id: string) {
  return useQuery({
    queryKey: ['email', 'campaign', id],
    queryFn: () => emailApi.getCampaign(id),
    enabled: Boolean(id),
  });
}

/**
 * Enquanto a campanha está enviando, repesca a cada 5s — é assim que a barra
 * de progresso anda sozinha sem precisar de socket.
 */
export function useCampaignStats(id: string, isSending: boolean) {
  return useQuery({
    queryKey: ['email', 'stats', id],
    queryFn: () => emailApi.stats(id),
    enabled: Boolean(id),
    refetchInterval: isSending ? 5000 : false,
  });
}

export function useSendCampaign(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => emailApi.sendCampaign(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['email', 'campaign', id] });
      qc.invalidateQueries({ queryKey: ['email', 'stats', id] });
    },
  });
}

/**
 * Contagem de público ao vivo, com debounce de 400ms para não bater na API
 * a cada tecla enquanto o operador monta o filtro. `enabled` deixa a tela
 * segurar a query até a campanha carregar.
 */
export function useAudienceCount(id: string, filter: AudienceFilter, enabled = true) {
  const debouncedFilter = useDebouncedValue(filter, 400);
  return useQuery({
    queryKey: ['email', 'audience-count', id, debouncedFilter],
    queryFn: () => emailApi.audienceCount(id, debouncedFilter),
    enabled: enabled && Boolean(id),
    // Mantém a última contagem na tela enquanto o debounce da tecla seguinte
    // ainda não resolveu — sem isso o número pisca para "carregando" a cada
    // clique num filtro, o que é pior do que mostrar um número levemente
    // desatualizado por 400ms.
    placeholderData: (previous) => previous,
  });
}

/** Adicionar/remover etiqueta de um destinatário. A lista de destinatários é a fonte da verdade — invalida ela. */
export function useSubscriberTagMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['email', 'subscribers'] });
  return {
    add: useMutation({
      mutationFn: ({ subscriberId, tagId }: { subscriberId: string; tagId: string }) =>
        emailApi.addSubscriberTag(subscriberId, tagId),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: ({ subscriberId, tagId }: { subscriberId: string; tagId: string }) =>
        emailApi.removeSubscriberTag(subscriberId, tagId),
      onSuccess: invalidate,
    }),
  };
}
