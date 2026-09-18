import type { Message } from '../services/inbox.service';

const WINDOW_MS = 24 * 60 * 60 * 1000;

export interface WindowState {
  applicable: boolean;
  /** Texto livre liberado (CSW de 24h desde o último inbound). */
  open: boolean;
  closed: boolean;
  msLeft: number;
  expiresAt: number | null;
  /**
   * Free entry point de 72h (lead de anúncio Click-to-WhatsApp): até aqui
   * templates saem GRATUITOS. É contagem de custo — NÃO libera texto livre
   * (a Meta recusa com 131047 fora das 24h).
   */
  freeEntryOpen: boolean;
  freeEntryMsLeft: number;
}

const NOT_APPLICABLE: WindowState = {
  applicable: false,
  open: false,
  closed: false,
  msLeft: 0,
  expiresAt: null,
  freeEntryOpen: false,
  freeEntryMsLeft: 0,
};

/**
 * Estado das duas contagens do WhatsApp Cloud API oficial. Só se aplica a
 * canais WHATSAPP_OFFICIAL — os demais (Zappfy/Uazapi) não têm a regra da Meta.
 *
 * - Texto livre: 24h a contar do último inbound (servidor manda em
 *   `windowExpiresAt`; fallback local pelo último inbound carregado).
 * - Template grátis: 72h do anúncio (`freeEntryExpiresAt`, só servidor).
 */
export function computeWindowState(opts: {
  channelType?: string;
  lastInboundAt?: string | null;
  windowExpiresAt?: string | null;
  freeEntryExpiresAt?: string | null;
  now: number;
}): WindowState {
  if (opts.channelType !== 'WHATSAPP_OFFICIAL') return NOT_APPLICABLE;

  const freeEntryMsLeft = opts.freeEntryExpiresAt
    ? Math.max(0, new Date(opts.freeEntryExpiresAt).getTime() - opts.now)
    : 0;
  const freeEntry = { freeEntryOpen: freeEntryMsLeft > 0, freeEntryMsLeft };

  const expiresAt = opts.windowExpiresAt
    ? new Date(opts.windowExpiresAt).getTime()
    : opts.lastInboundAt
      ? new Date(opts.lastInboundAt).getTime() + WINDOW_MS
      : null;
  if (expiresAt === null) {
    return { ...NOT_APPLICABLE, applicable: true, ...freeEntry };
  }
  const msLeft = expiresAt - opts.now;
  return {
    applicable: true,
    open: msLeft > 0,
    closed: msLeft <= 0,
    msLeft: Math.max(0, msLeft),
    expiresAt,
    ...freeEntry,
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

const H = 60 * 60 * 1000;

export type WindowUrgency = 'calm' | 'tight' | 'closing';

/** Verde acima de 6h, âmbar abaixo, vermelho na última hora. */
export function windowUrgency(msLeft: number): WindowUrgency {
  if (msLeft <= 1 * H) return 'closing';
  if (msLeft <= 6 * H) return 'tight';
  return 'calm';
}

/** "26h" / "3h32" / "42min" — curto o bastante para caber ao lado do nome. */
export function formatWindowLeft(ms: number): string {
  const totalMin = Math.floor(ms / 60000);
  if (totalMin < 60) return `${totalMin}min`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h >= 10 || m === 0) return `${h}h`;
  return `${h}h${String(m).padStart(2, '0')}`;
}
