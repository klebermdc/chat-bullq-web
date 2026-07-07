import type { Message } from '../services/inbox.service';

const WINDOW_MS = 24 * 60 * 60 * 1000;

export interface WindowState {
  applicable: boolean;
  open: boolean;
  closed: boolean;
  msLeft: number;
  expiresAt: number | null;
}

/**
 * Estado da "janela de atendimento" de 24h do WhatsApp Cloud API oficial.
 * Só se aplica a canais WHATSAPP_OFFICIAL — os demais (Zappfy/Wasender) não
 * têm essa restrição da Meta. A janela reabre a cada mensagem INBOUND.
 */
export function computeWindowState(opts: {
  channelType?: string;
  lastInboundAt?: string | null;
  now: number;
}): WindowState {
  const applicable = opts.channelType === 'WHATSAPP_OFFICIAL';
  if (!applicable || !opts.lastInboundAt) {
    return { applicable, open: false, closed: false, msLeft: 0, expiresAt: null };
  }
  const expiresAt = new Date(opts.lastInboundAt).getTime() + WINDOW_MS;
  const msLeft = expiresAt - opts.now;
  return {
    applicable,
    open: msLeft > 0,
    closed: msLeft <= 0,
    msLeft: Math.max(0, msLeft),
    expiresAt,
  };
}

/** Timestamp (createdAt) da última mensagem INBOUND, ou null se não houver. */
export function lastInboundAt(
  msgs: { direction: string; createdAt: string }[],
): string | null {
  for (let i = msgs.length - 1; i >= 0; i--) {
    if (msgs[i].direction === 'INBOUND') return msgs[i].createdAt;
  }
  return null;
}

/** Formata o tempo restante como "1h 23m" (ou "23m" quando < 1h). */
export function formatMsLeft(ms: number): string {
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}
