const MINUTES_PER_HOUR = 60;
const HOURS_PER_DAY = 24;
const MINUTE_MS = 60_000;

const CRITERION_LABELS: Record<string, string> = {
  diarioAcolhimento: 'Acolhimento',
  diarioDiagnostico: 'Diagnóstico',
  diarioClareza: 'Clareza',
  diarioProximoPasso: 'Próximo passo',
  diarioObjecoes: 'Objeções',
  diarioRegrasProduto: 'Regras de produto',
};

/** O dia vem como data pura; formata em UTC para não voltar um dia no Brasil. */
export function formatDiaryDay(day: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'UTC',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date(day));
}

export function formatMinutes(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined) return '—';
  if (minutes < MINUTES_PER_HOUR) return `${minutes} min`;
  const hours = Math.floor(minutes / MINUTES_PER_HOUR);
  const rest = minutes % MINUTES_PER_HOUR;
  return rest === 0 ? `${hours}h` : `${hours}h${String(rest).padStart(2, '0')}`;
}

export function formatCriterion(name: string): string {
  return CRITERION_LABELS[name] ?? name.replace(/^diario/, '');
}

export function formatWaitingSince(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

/** "há 3 h", "há 2 dias": quanto tempo o cliente ou o card está parado. */
export function formatElapsed(iso: string, now: Date): string {
  const minutes = Math.max(0, Math.floor((now.getTime() - new Date(iso).getTime()) / MINUTE_MS));
  if (minutes < MINUTES_PER_HOUR) return `há ${minutes} min`;
  const hours = Math.floor(minutes / MINUTES_PER_HOUR);
  if (hours < HOURS_PER_DAY) return `há ${hours} h`;
  const days = Math.floor(hours / HOURS_PER_DAY);
  return days === 1 ? 'há 1 dia' : `há ${days} dias`;
}

export function formatClock(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

export function formatMoney(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value);
}
