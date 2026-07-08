'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cadencesService } from '../services/cadences.service';
import type { Cadence } from '../types';

export function useCadences() {
  return useQuery({ queryKey: ['cadences'], queryFn: () => cadencesService.list() });
}

export function useDefaultCadence() {
  return useQuery({
    queryKey: ['cadence-default'],
    queryFn: () => cadencesService.getDefaultTemplate(),
  });
}

export function useSaveCadence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (c: Cadence) =>
      c.id ? cadencesService.update(c.id, c) : cadencesService.create(c),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cadences'] }),
  });
}

export function useActiveEnrollment(conversationId: string | undefined) {
  return useQuery({
    queryKey: ['cadence-active', conversationId],
    queryFn: () => cadencesService.activeForConversation(conversationId!),
    enabled: !!conversationId,
  });
}

export function useStopEnrollment(conversationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (enrollmentId: string) => cadencesService.stopEnrollment(enrollmentId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cadence-active', conversationId] }),
  });
}
