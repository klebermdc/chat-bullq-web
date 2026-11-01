const MINUTES_PER_HOUR = 60;

/** O dia vem como data pura; formata em UTC para não voltar um dia no Brasil. */
export function formatDiaryDay(day: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'UTC',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date(day));
}

export function formatMinutes(minutes: number | null): string {
  if (minutes === null) return '—';
  if (minutes < MINUTES_PER_HOUR) return `${minutes} min`;
  const hours = Math.floor(minutes / MINUTES_PER_HOUR);
  const rest = minutes % MINUTES_PER_HOUR;
  return rest === 0 ? `${hours}h` : `${hours}h${String(rest).padStart(2, '0')}`;
}
