/**
 * Logout por inatividade.
 *
 * O "último uso" fica no localStorage (compartilhado entre as abas): mexer em
 * qualquer aba mantém todas vivas, e todas expiram juntas quando ninguém mexe
 * por IDLE_LOGOUT_MS — inclusive aba esquecida aberta, computador que dormiu ou
 * navegador reaberto no dia seguinte.
 */
export const IDLE_LOGOUT_MS = 15 * 60_000;
/** Faixa de aviso antes de sair (o operador mexe e o aviso some). */
export const IDLE_WARNING_MS = 60_000;
/** Gravar no localStorage no máximo a cada 5s (pointermove dispara muito). */
export const ACTIVITY_WRITE_INTERVAL_MS = 5_000;
export const LAST_ACTIVITY_KEY = 'last_activity_at';
export const IDLE_LOGOUT_REASON = 'inatividade';

export type IdleStatus =
  | { kind: 'active' }
  | { kind: 'warning'; secondsLeft: number }
  | { kind: 'expired' };

export function parseLastActivity(raw: string | null): number | null {
  if (raw === null) return null;
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : null;
}

/**
 * Sem registro conta como ativo: a sessão acabou de começar (login grava o
 * registro) ou o storage está bloqueado — nesse caso o hook passa a contar a
 * partir de agora em memória.
 */
export function getIdleStatus(
  lastActivityAt: number | null,
  now: number,
  idleMs: number = IDLE_LOGOUT_MS,
  warningMs: number = IDLE_WARNING_MS,
): IdleStatus {
  if (lastActivityAt === null) return { kind: 'active' };
  const left = idleMs - (now - lastActivityAt);
  if (left <= 0) return { kind: 'expired' };
  if (left <= warningMs) return { kind: 'warning', secondsLeft: Math.ceil(left / 1000) };
  return { kind: 'active' };
}

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // storage bloqueado: o hook segue com o valor em memória
  }
}

export function readLastActivity(): number | null {
  return parseLastActivity(safeGet(LAST_ACTIVITY_KEY));
}

/** Marca uso agora. Chamado no login para não herdar o registro velho. */
export function markActivity(now: number = Date.now()): void {
  safeSet(LAST_ACTIVITY_KEY, String(now));
}

export function clearLastActivity(): void {
  try {
    localStorage.removeItem(LAST_ACTIVITY_KEY);
  } catch {
    // nada a limpar
  }
}
