'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { schedulingService } from '../services/scheduling.service';
import type { CreateScheduledMessageInput } from '../types';

export function useScheduledMessages(conversationId: string | undefined) {
  return useQuery({
    queryKey: ['scheduled-messages', conversationId],
    queryFn: () => schedulingService.listForConversation(conversationId!),
    enabled: !!conversationId,
  });
}

export function useCreateScheduledMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateScheduledMessageInput) => schedulingService.create(input),
    onSuccess: (_res, input) =>
      qc.invalidateQueries({ queryKey: ['scheduled-messages', input.conversationId] }),
  });
}

export function useCancelScheduledMessage(conversationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => schedulingService.cancel(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['scheduled-messages', conversationId] }),
  });
}
