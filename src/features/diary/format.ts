const MINUTES_PER_HOUR = 60;

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
