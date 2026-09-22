/**
 * Throttle do evento `presence:active` (painel "Equipe agora").
 *
 * O servidor só precisa saber que o atendente mexeu no app no último minuto,
 * então basta um emit a cada 60s no máximo. `tryEmit` só consome a janela
 * quando o emit realmente saiu (socket conectado) — se o socket estava caído,
 * a próxima interação tenta de novo. `reset` reabre a janela (usado quando o
 * socket reconecta e o servidor perdeu o estado da conexão anterior).
 */
export const PRESENCE_ACTIVE_INTERVAL_MS = 60_000;

export interface ActivityThrottle {
  tryEmit: (emit: () => boolean) => boolean;
  reset: () => void;
}

export function createActivityThrottle(
  intervalMs: number = PRESENCE_ACTIVE_INTERVAL_MS,
  now: () => number = Date.now,
): ActivityThrottle {
  let lastEmitAt: number | null = null;
  return {
    tryEmit(emit) {
      const t = now();
      if (lastEmitAt !== null && t - lastEmitAt < intervalMs) return false;
      if (!emit()) return false;
      lastEmitAt = t;
      return true;
    },
    reset() {
      lastEmitAt = null;
    },
  };
}
