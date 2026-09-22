import type { PresenceStatus, TeamPresenceRow } from '../services/dashboard.service';

/**
 * Helpers puros do painel "Equipe agora". Sem date-fns/dayjs (o projeto não
 * usa): formatação em pt-BR feita à mão, com `now` injetável pros testes.
 */

const MINUTES_PER_HOUR = 60;
const MS_PER_MINUTE = 60_000;
const DAY_MS = 24 * 60 * MS_PER_MINUTE;

/** 320 → "5h 20min"; 60 → "1h"; 45 → "45min"; 0 → "0min". */
export function formatMinutes(total: number): string {
  const safe = Number.isFinite(total) && total > 0 ? Math.round(total) : 0;
  const hours = Math.floor(safe / MINUTES_PER_HOUR);
  const minutes = safe % MINUTES_PER_HOUR;
  if (hours === 0) return `${minutes}min`;
  return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}min`;
}

export type PresenceTone = 'success' | 'hot' | 'neutral';

const STATUS_META: Record<PresenceStatus, { label: string; tone: PresenceTone; dot: string }> = {
  online: { label: 'Online', tone: 'success', dot: 'bg-emerald-500' },
  away: { label: 'Ausente', tone: 'hot', dot: 'bg-amber-500' },
  offline: { label: 'Offline', tone: 'neutral', dot: 'bg-zinc-400' },
};

export function statusMeta(status: PresenceStatus) {
  return STATUS_META[status] ?? STATUS_META.offline;
}

export type ScheduleTone = 'success' | 'muted' | 'warning';

export function scheduleLabel(schedule: TeamPresenceRow['schedule']): { label: string; tone: ScheduleTone } {
  if (!schedule.configured || schedule.withinHours === null) return { label: 'Sem horário', tone: 'muted' };
  if (schedule.withinHours) return { label: 'No horário', tone: 'success' };
  return {
    label: schedule.returnsAt ? `Fora · volta ${schedule.returnsAt}` : 'Fora do horário',
    tone: 'warning',
  };
}

function parse(iso: string | null): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

const pad = (n: number) => String(n).padStart(2, '0');

function clock(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** ISO → "HH:mm" no fuso do navegador; "—" quando vazio/inválido. */
export function formatClock(iso: string | null): string {
  const d = parse(iso);
  return d ? clock(d) : '—';
}

/**
 * "agora" · "há 4 min" · "há 3 h" (mesmo dia) · "ontem 19:52" · "18/09 10:05".
 * "—" quando não há resposta.
 */
export function formatLastReply(iso: string | null, now: Date = new Date()): string {
  const d = parse(iso);
  if (!d) return '—';
  const diffMin = Math.floor((now.getTime() - d.getTime()) / MS_PER_MINUTE);
  if (diffMin < 1) return 'agora';
  const today = startOfDay(now);
  if (d.getTime() >= today) {
    if (diffMin < MINUTES_PER_HOUR) return `há ${diffMin} min`;
    return `há ${Math.floor(diffMin / MINUTES_PER_HOUR)} h`;
  }
  if (d.getTime() >= today - DAY_MS) return `ontem ${clock(d)}`;
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${clock(d)}`;
}

/** Média online por dia com presença; null quando não houve dia online. */
export function avgOnlinePerDay(period: TeamPresenceRow['period']): number | null {
  if (period.daysOnline <= 0) return null;
  return Math.round(period.onlineMinutes / period.daysOnline);
}
