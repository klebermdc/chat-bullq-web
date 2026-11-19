'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import {
  ACTIVITY_WRITE_INTERVAL_MS,
  getIdleStatus,
  markActivity,
  readLastActivity,
} from '@/lib/idle-logout';

// Mesmo conjunto do usePresenceActivity: ler a conversa rolando ou movendo o
// mouse também é uso.
const ACTIVITY_EVENTS = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart'] as const;
const CHECK_INTERVAL_MS = 1_000;

/**
 * Desloga sozinho após 15 min sem uso em nenhuma aba. Devolve os segundos que
 * faltam quando está no último minuto (para a faixa de aviso), ou null.
 */
export function useIdleLogout(): number | null {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  useEffect(() => {
    // Fallback em memória se o localStorage estiver bloqueado.
    let memoryLast = Date.now();
    let lastWriteAt = 0;
    let isExpired = false;

    const recordActivity = () => {
      const now = Date.now();
      memoryLast = now;
      if (now - lastWriteAt < ACTIVITY_WRITE_INTERVAL_MS) return;
      lastWriteAt = now;
      markActivity(now);
    };

    const check = () => {
      if (isExpired) return;
      const status = getIdleStatus(readLastActivity() ?? memoryLast, Date.now());
      if (status.kind === 'expired') {
        isExpired = true;
        useAuthStore.getState().expireSession();
        return;
      }
      setSecondsLeft(status.kind === 'warning' ? status.secondsLeft : null);
    };

    // Navegador reaberto / aba que dormiu: confere antes de marcar uso.
    if (readLastActivity() === null) markActivity();
    check();

    const onActivity = () => {
      recordActivity();
      setSecondsLeft(null);
    };
    // Aba em segundo plano tem timer limitado pelo navegador: confere ao voltar.
    const onVisibility = () => {
      if (document.visibilityState === 'visible') check();
    };
    // Outra aba saiu (inatividade ou botão Sair): esta sai junto.
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'access_token' && e.newValue === null && !isExpired) {
        isExpired = true;
        window.location.href = '/login';
      }
    };

    const opts: AddEventListenerOptions = { passive: true };
    for (const ev of ACTIVITY_EVENTS) window.addEventListener(ev, onActivity, opts);
    window.addEventListener('scroll', onActivity, { passive: true, capture: true });
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('storage', onStorage);
    const timer = window.setInterval(check, CHECK_INTERVAL_MS);

    return () => {
      for (const ev of ACTIVITY_EVENTS) window.removeEventListener(ev, onActivity, opts);
      window.removeEventListener('scroll', onActivity, { capture: true });
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('storage', onStorage);
      window.clearInterval(timer);
    };
  }, []);

  return secondsLeft;
}
