import type { PresenceStatus } from '../api';

const PRESENCE_LABEL: Record<PresenceStatus, string> = {
  online: 'Na mesa',
  away: 'Ausente',
  offline: 'Fora',
};

export function presenceLabel(status: PresenceStatus): string {
  return PRESENCE_LABEL[status] ?? PRESENCE_LABEL.offline;
}

/** "5 min", "2h30"; nulo sem espera. */
export function waitedLabel(since: string | null, now: Date): string | null {
  if (!since) return null;
  const minutes = Math.max(0, Math.round((now.getTime() - new Date(since).getTime()) / 60_000));
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`;
}

/** "22/11" a partir de "2026-11-22". */
export function formatDay(ymd: string): string {
  const [, m, d] = ymd.split('-');
  return d && m ? `${d}/${m}` : ymd;
}
