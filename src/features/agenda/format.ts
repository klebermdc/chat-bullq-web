import type { Appointment, AppointmentKind, AppointmentSource, AppointmentStatus } from './api';

/** A agenda mostra tudo no horário de Brasília (onde as agências atendem). */
export const AGENDA_TZ = 'America/Sao_Paulo';

const pad = (n: number) => String(n).padStart(2, '0');

/** "AAAA-MM-DD" do dia em Brasília. */
export function dayKey(date: Date, tz = AGENDA_TZ): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

/** Segunda a domingo da semana de `ref` (deslocada `offsetWeeks`), como dias em Brasília. */
export function weekRange(ref: Date, offsetWeeks = 0): { from: string; to: string; days: string[] } {
  const [y, m, d] = dayKey(ref).split('-').map(Number);
  const base = new Date(Date.UTC(y, m - 1, d));
  const dow = (base.getUTCDay() + 6) % 7; // segunda = 0
  const monday = new Date(base.getTime() + (offsetWeeks * 7 - dow) * 86_400_000);
  const days = Array.from({ length: 7 }, (_, i) => {
    const t = new Date(monday.getTime() + i * 86_400_000);
    return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
  });
  return { from: days[0], to: days[6], days };
}

export function groupByDay(items: Appointment[]): Map<string, Appointment[]> {
  const map = new Map<string, Appointment[]>();
  for (const item of [...items].sort((a, b) => a.startsAt.localeCompare(b.startsAt))) {
    const key = dayKey(new Date(item.startsAt));
    map.set(key, [...(map.get(key) ?? []), item]);
  }
  return map;
}

export function timeLabel(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: AGENDA_TZ, hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(iso));
}

/** "segunda-feira, 16/11" a partir de "2026-11-16". */
export function dayLabel(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC', weekday: 'long', day: '2-digit', month: '2-digit' }).format(
    new Date(Date.UTC(y, m - 1, d, 12)),
  );
}

/** "seg., 16/11 às 15:00" para escolher horário. */
export function slotLabel(iso: string): string {
  const date = new Date(iso);
  const day = new Intl.DateTimeFormat('pt-BR', { timeZone: AGENDA_TZ, weekday: 'short', day: '2-digit', month: '2-digit' }).format(date);
  return `${day} às ${timeLabel(iso)}`;
}

export const STATUS_LABEL: Record<AppointmentStatus, string> = {
  MARCADO: 'Marcado',
  FEITO: 'Feito',
  CANCELADO: 'Cancelado',
  NAO_ATENDEU: 'Não atendeu',
};

export const KIND_LABEL: Record<AppointmentKind, string> = {
  RETORNO_LIGACAO: 'Retorno de ligação',
  REUNIAO: 'Reunião',
};

export const SOURCE_LABEL: Record<AppointmentSource, string> = {
  ALINE_VOZ: 'Aline (ligação)',
  ALINE_CHAT: 'Aline (chat)',
  MANUAL: 'Manual',
};
