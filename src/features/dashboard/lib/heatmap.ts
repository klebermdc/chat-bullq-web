const DAYS = 7;
const HOURS = 24;

/**
 * A API agrega os picos em UTC. Desloca a matriz [dia][hora] para o fuso de
 * quem está vendo, virando o dia quando a hora cruza a meia-noite.
 * `offsetHours` é o deslocamento local em relação ao UTC (Brasília = -3).
 * Devolve uma matriz nova; a recebida não é alterada.
 */
export function shiftHeatmapHours(matrix: number[][], offsetHours: number): number[][] {
  const shifted = Array.from({ length: DAYS }, () => Array.from({ length: HOURS }, () => 0));
  const offset = Math.round(offsetHours);
  for (let day = 0; day < DAYS; day++) {
    for (let hour = 0; hour < HOURS; hour++) {
      const total = day * HOURS + hour + offset;
      const wrapped = ((total % (DAYS * HOURS)) + DAYS * HOURS) % (DAYS * HOURS);
      shifted[Math.floor(wrapped / HOURS)][wrapped % HOURS] += matrix[day]?.[hour] ?? 0;
    }
  }
  return shifted;
}

/** Deslocamento do navegador em horas (Brasília = -3). */
export function localUtcOffsetHours(now: Date = new Date()): number {
  return -now.getTimezoneOffset() / 60;
}
