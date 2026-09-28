import { describe, expect, it } from 'vitest';
import { parseDateOnly, toLocalDate } from './date-only';

describe('parseDateOnly', () => {
  it('lê YYYY-MM-DD puro', () => {
    expect(parseDateOnly('2026-08-01')).toEqual({ year: 2026, month: 8, day: 1 });
  });

  it('lê a data que o Prisma devolve à meia-noite UTC', () => {
    expect(parseDateOnly('2026-08-01T00:00:00.000Z')).toEqual({ year: 2026, month: 8, day: 1 });
    expect(parseDateOnly('2026-08-01T00:00:00Z')).toEqual({ year: 2026, month: 8, day: 1 });
  });

  it('ignora timestamps com hora de verdade', () => {
    expect(parseDateOnly('2026-08-01T14:32:10.000Z')).toBeNull();
    expect(parseDateOnly('lixo')).toBeNull();
  });
});

describe('toLocalDate', () => {
  it('mantém o dia do calendário para datas sem hora', () => {
    const d = toLocalDate('2026-08-01T00:00:00.000Z');
    expect([d?.getFullYear(), d?.getMonth(), d?.getDate()]).toEqual([2026, 7, 1]);
  });

  it('usa o horário normal para timestamps', () => {
    expect(toLocalDate('2026-08-01T14:32:10.000Z')?.toISOString()).toBe('2026-08-01T14:32:10.000Z');
  });

  it('devolve null para vazio ou inválido', () => {
    expect(toLocalDate(null)).toBeNull();
    expect(toLocalDate('abc')).toBeNull();
  });
});
