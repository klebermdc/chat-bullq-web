import type { LastMessage } from '../services/inbox.service';

const MIN = 60 * 1000;

export type WaitLevel = 'none' | 'fresh' | 'late' | 'overdue';

/**
 * Há quanto tempo o cliente está esperando resposta.
 *
 * Só conta quando a ÚLTIMA mensagem da conversa é do cliente: se alguém já
 * respondeu (ou a Aline respondeu), ninguém está esperando. Conversa encerrada
 * também não espera nada.
 */
export function waitingMs(opts: {
  status: string;
  lastMessage: LastMessage | undefined;
  now: number;
}): number {
  if (opts.status === 'CLOSED') return 0;
  const last = opts.lastMessage;
  if (!last || last.direction !== 'INBOUND') return 0;
  const at = new Date(last.createdAt).getTime();
  if (Number.isNaN(at)) return 0;
  return Math.max(0, opts.now - at);
}

/**
 * Faixas da espera. Abaixo de 30min não marca nada — numa operação de
 * WhatsApp isso é o ritmo normal, e pintar tudo tiraria o sentido da cor.
 */
export function waitLevel(ms: number): WaitLevel {
  if (ms <= 0) return 'none';
  if (ms < 30 * MIN) return 'fresh';
  if (ms < 2 * 60 * MIN) return 'late';
  return 'overdue';
}

/** Cor da espinha por faixa. `fresh` fica sem cor de propósito. */
export const WAIT_SPINE_CLASS: Record<WaitLevel, string> = {
  none: '',
  fresh: '',
  late: 'bg-warning',
  overdue: 'bg-urgent',
};

/** Texto do title= da espinha, para quem passa o mouse. */
export function waitLabel(ms: number): string {
  const totalMin = Math.floor(ms / MIN);
  if (totalMin < 60) return `Esperando resposta há ${totalMin}min`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return m === 0
    ? `Esperando resposta há ${h}h`
    : `Esperando resposta há ${h}h${String(m).padStart(2, '0')}`;
}
