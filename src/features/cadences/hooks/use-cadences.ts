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

/** Retoma na hora uma cadência pausada (revive) sem esperar o watchdog. */
export function useResumeEnrollment(conversationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (enrollmentId: string) => cadencesService.resumeEnrollment(enrollmentId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cadence-active', conversationId] }),
  });
}

/**
 * Coloca a conversa de volta numa cadência do zero (passo 1). Usado quando não
 * há mais enrollment vivo — cadência encerrada por handoff, esgotada, etc.
 */
export function useStartCadence(conversationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (cadenceId: string) =>
      cadencesService.startForConversation(cadenceId, conversationId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cadence-active', conversationId] }),
  });
}
