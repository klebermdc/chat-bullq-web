'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { schedulingService } from '../services/scheduling.service';
import type { InactivitySettings } from '../types';

export function useInactivitySettings() {
  return useQuery({ queryKey: ['inactivity-settings'], queryFn: () => schedulingService.getSettings() });
}
export function useUpdateInactivitySettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<InactivitySettings>) => schedulingService.updateSettings(patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inactivity-settings'] }),
  });
}
export function useInactivityReport(params: { band?: number; page?: number } = {}) {
  return useQuery({ queryKey: ['inactivity-report', params], queryFn: () => schedulingService.report(params) });
}
export function useReengageSuggestion(conversationId: string | undefined) {
  return useQuery({
    queryKey: ['reengage-suggestion', conversationId],
    queryFn: () => schedulingService.reengageSuggestion(conversationId!),
    enabled: !!conversationId,
  });
}
