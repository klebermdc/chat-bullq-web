/**
 * Feriado da agência: a API guarda o instante de fim (`aiHolidayUntil`, meia-
 * noite que encerra o último dia). A tela trabalha com o último dia
 * (AAAA-MM-DD) no fuso da agência.
 */

/** Mesmo limite da API: o feriado vai no máximo 15 dias à frente. */
export const MAX_HOLIDAY_DAYS = 15;

const DAY_MS = 86_400_000;

/** AAAA-MM-DD do instante no fuso da agência. */
export function localDateKey(at: Date, tz: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(at);
}

export interface HolidayState {
  isActive: boolean;
  /** Hoje no fuso da agência (mínimo do seletor de data). */
  today: string;
  /** Último dia permitido no seletor. */
  maxDate: string;
  /** Último dia do feriado ativo (AAAA-MM-DD); null se desligado. */
  lastDay: string | null;
  /** "21/11" para o texto da tela; null se desligado. */
  lastDayLabel: string | null;
}

export function holidayState(until: string | null | undefined, tz: string, now: Date): HolidayState {
  const end = until ? new Date(until) : null;
  const isActive = !!end && end.getTime() > now.getTime();
  // 1 ms antes da meia-noite de fim ainda é o último dia.
  const lastInstant = isActive && end ? new Date(end.getTime() - 1) : null;
  return {
    isActive,
    today: localDateKey(now, tz),
    maxDate: localDateKey(new Date(now.getTime() + MAX_HOLIDAY_DAYS * DAY_MS), tz),
    lastDay: lastInstant ? localDateKey(lastInstant, tz) : null,
    lastDayLabel: lastInstant
      ? new Intl.DateTimeFormat('pt-BR', { timeZone: tz, day: '2-digit', month: '2-digit' }).format(lastInstant)
      : null,
  };
}
