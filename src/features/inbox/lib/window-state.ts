import type { Message } from '../services/inbox.service';

const WINDOW_MS = 24 * 60 * 60 * 1000;

export type WindowKind = 'csw24' | 'ctwa72';

export interface WindowState {
  applicable: boolean;
  open: boolean;
  closed: boolean;
  msLeft: number;
  expiresAt: number | null;
  /** Qual regra deu a janela vigente — define se o texto diz 24h ou 72h. */
  kind: WindowKind | null;
}

/** "24h" / "72h" para os rótulos, a partir da regra vigente. */
export function windowKindLabel(kind: WindowKind | null): string {
  return kind === 'ctwa72' ? '72h' : '24h';
}

/**
 * Estado da "janela de atendimento" do WhatsApp Cloud API oficial.
 * Só se aplica a canais WHATSAPP_OFFICIAL — os demais (Zappfy/Wasender) não
 * têm essa restrição da Meta. A janela reabre a cada mensagem INBOUND.
 *
 * São DUAS janelas: 24h a contar do último inbound (CSW) e 72h a contar do
 * clique num anúncio Click-to-WhatsApp (free entry point). Quem manda é a
 * mais longa, e essa conta é do servidor — `windowExpiresAt`/`windowKind`.
 */
export function computeWindowState(opts: {
  channelType?: string;
  lastInboundAt?: string | null;
  windowExpiresAt?: string | null; // servidor (preferido) — já cobre 24h/72h CTWA
  windowKind?: WindowKind | null;
  now: number;
}): WindowState {
  const applicable = opts.channelType === 'WHATSAPP_OFFICIAL';
  if (!applicable) {
    return {
      applicable,
      open: false,
      closed: false,
      msLeft: 0,
      expiresAt: null,
      kind: null,
    };
  }
  // Preferir a expiração computada no servidor (cobre a janela de 72h de CTWA).
  // Fallback: cálculo antigo de 24h a partir do último inbound (cache velho).
  const fromServer = !!opts.windowExpiresAt;
  const expiresAt = opts.windowExpiresAt
    ? new Date(opts.windowExpiresAt).getTime()
    : opts.lastInboundAt
      ? new Date(opts.lastInboundAt).getTime() + WINDOW_MS
      : null;
  if (expiresAt === null) {
    return {
      applicable,
      open: false,
      closed: false,
      msLeft: 0,
      expiresAt: null,
      kind: null,
    };
  }
  const msLeft = expiresAt - opts.now;
  return {
    applicable,
    open: msLeft > 0,
    closed: msLeft <= 0,
    msLeft: Math.max(0, msLeft),
    expiresAt,
    // No fallback a conta É a de 24h — não herdar um windowKind de outra fonte.
    kind: fromServer ? (opts.windowKind ?? 'csw24') : 'csw24',
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
