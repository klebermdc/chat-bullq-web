'use client';

import { useEffect } from 'react';
import { getSocket } from '@/lib/socket';
import { createActivityThrottle } from '@/lib/presence-activity';

// Interações que contam como "atendente mexendo no app". pointermove entra
// porque ler a conversa rolando/movendo o mouse também é trabalho; o handler é
// só uma comparação de timestamp, então o volume de eventos não pesa.
const ACTIVITY_EVENTS = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart'] as const;

/**
 * Avisa o servidor (evento `presence:active`) que o usuário está ativo, no
 * máximo 1x/min, só com a aba visível e o socket conectado. Alimenta o tempo
 * "ativo" do painel Equipe agora — conectado ≠ ativo (aba esquecida aberta).
 */
export function usePresenceActivity() {
  useEffect(() => {
    const socket = getSocket();
    const throttle = createActivityThrottle();

    const emit = () => {
      if (!socket.connected) return false;
      socket.emit('presence:active');
      return true;
    };

    const onActivity = () => {
      if (document.visibilityState !== 'visible') return;
      throttle.tryEmit(emit);
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') throttle.tryEmit(emit);
    };

    // O servidor ignora o evento antes do `ready` (handshake/auth) e cada
    // reconexão é um socket novo lá: reabre a janela pra próxima interação.
    const onReady = () => throttle.reset();

    const opts: AddEventListenerOptions = { passive: true };
    for (const ev of ACTIVITY_EVENTS) window.addEventListener(ev, onActivity, opts);
    // scroll não borbulha: capture pra pegar a rolagem de qualquer painel.
    window.addEventListener('scroll', onActivity, { passive: true, capture: true });
    document.addEventListener('visibilitychange', onVisibility);
    socket.on('ready', onReady);

    return () => {
      for (const ev of ACTIVITY_EVENTS) window.removeEventListener(ev, onActivity, opts);
      window.removeEventListener('scroll', onActivity, { capture: true });
      document.removeEventListener('visibilitychange', onVisibility);
      socket.off('ready', onReady);
    };
  }, []);
}
