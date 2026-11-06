'use client';
import { useEffect } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { syncPushSubscription } from '../lib/push-client';

/**
 * A cada abertura do app (e troca de empresa), com a permissão já concedida,
 * renova a inscrição de push deste aparelho para a empresa ativa. Sem
 * permissão não pergunta nada: o pedido só sai pelo botão nas preferências.
 */
export function usePushSync() {
  const activeOrgId = useAuthStore((s) => s.activeOrgId);

  useEffect(() => {
    if (!activeOrgId) return;
    void syncPushSubscription();
  }, [activeOrgId]);
}
