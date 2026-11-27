/**
 * O agendamento é sempre no horário de Brasília, onde a equipe trabalha,
 * mesmo que o navegador esteja em outro fuso. O campo `datetime-local` só
 * sabe de "AAAA-MM-DDTHH:mm" sem fuso; aqui convertemos de/para ISO UTC.
 */
export const BRASILIA_TZ = 'America/Sao_Paulo';

const INPUT_VALUE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

interface WallClock {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

const wallClockFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: BRASILIA_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

function wallClockOf(date: Date): WallClock {
  const parts = Object.fromEntries(wallClockFormat.formatToParts(date).map((p) => [p.type, p.value]));
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
  };
}

const wallClockAsUtc = (w: WallClock): number => Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute);
const pad = (n: number) => String(n).padStart(2, '0');

/** ISO UTC → valor do `datetime-local` em Brasília ('' quando não há data). */
export function toBrasiliaInputValue(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const w = wallClockOf(date);
  return `${w.year}-${pad(w.month)}-${pad(w.day)}T${pad(w.hour)}:${pad(w.minute)}`;
}

/** Valor do `datetime-local` (lido como Brasília) → ISO UTC; null se vazio ou inválido. */
export function fromBrasiliaInputValue(value: string): string | null {
  const match = INPUT_VALUE.exec(value);
  if (!match) return null;
  const [year, month, day, hour, minute] = match.slice(1).map(Number);
  const target = Date.UTC(year, month - 1, day, hour, minute);
  // Chuta como se fosse UTC e corrige pela diferença que Brasília mostra;
  // a segunda volta acerta o raro caso de mudança de fuso no meio.
  let guess = target;
  for (let i = 0; i < 2; i += 1) {
    guess += target - wallClockAsUtc(wallClockOf(new Date(guess)));
  }
  return new Date(guess).toISOString();
}

const whenFormat = new Intl.DateTimeFormat('pt-BR', {
  timeZone: BRASILIA_TZ,
  weekday: 'short',
  day: '2-digit',
  month: '2-digit',
});
const timeFormat = new Intl.DateTimeFormat('pt-BR', {
  timeZone: BRASILIA_TZ,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

/** "sex., 28/11 às 10:00" em Brasília. */
export function formatWhen(iso: string): string {
  const date = new Date(iso);
  return `${whenFormat.format(date)} às ${timeFormat.format(date)}`;
}

const dayFormat = new Intl.DateTimeFormat('pt-BR', {
  timeZone: BRASILIA_TZ,
  weekday: 'long',
  day: '2-digit',
  month: '2-digit',
});

/** "sexta-feira, 28/11" em Brasília, para separar a lista por dia. */
export function formatDay(iso: string): string {
  return dayFormat.format(new Date(iso));
}

/** Chave "AAAA-MM-DD" do dia em Brasília. */
export function brasiliaDayKey(iso: string): string {
  return toBrasiliaInputValue(iso).slice(0, 10);
}

/** A data escolhida ainda está no futuro? */
export function isFuture(iso: string | null, now: Date): boolean {
  if (!iso) return false;
  return new Date(iso).getTime() > now.getTime();
}
