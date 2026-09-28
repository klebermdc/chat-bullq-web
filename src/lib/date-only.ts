// Datas de calendário (início da viagem, nascimento) chegam como
// 'YYYY-MM-DD' ou como meia-noite UTC ('…T00:00:00.000Z'). `new Date()` nelas
// vira o dia ANTERIOR no Brasil (UTC-3): a viagem de 01/08 aparecia 31/07 e
// caía no mês errado do filtro. Aqui lemos o dia direto da string.

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})(?:T00:00:00(?:\.0+)?Z)?$/;

export interface DateOnlyParts {
  year: number;
  month: number; // 1-12
  day: number;
}

export function parseDateOnly(iso: string): DateOnlyParts | null {
  const m = DATE_ONLY.exec(iso);
  if (!m) return null;
  return { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) };
}

/** Date local que preserva o dia do calendário em datas sem hora. */
export function toLocalDate(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const parts = parseDateOnly(iso);
  const d = parts ? new Date(parts.year, parts.month - 1, parts.day) : new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}
