'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { emailApi, SubscriberStatus } from '@/lib/email-api';

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
