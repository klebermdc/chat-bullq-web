import { describe, expect, it } from 'vitest';
import {
  brasiliaDayKey,
  formatDay,
  formatWhen,
  fromBrasiliaInputValue,
  isFuture,
  toBrasiliaInputValue,
} from './brasilia-time';

describe('horário de Brasília no agendamento', () => {
  it('mostra no campo a hora de Brasília (UTC-3)', () => {
    expect(toBrasiliaInputValue('2026-11-28T13:00:00.000Z')).toBe('2026-11-28T10:00');
  });

  it('vira o dia certo perto da meia-noite UTC', () => {
    expect(toBrasiliaInputValue('2026-11-29T01:30:00.000Z')).toBe('2026-11-28T22:30');
  });

  it('converte o valor do campo de volta para ISO UTC', () => {
    expect(fromBrasiliaInputValue('2026-11-28T10:00')).toBe('2026-11-28T13:00:00.000Z');
    expect(fromBrasiliaInputValue('2026-11-28T22:30')).toBe('2026-11-29T01:30:00.000Z');
  });

  it('ida e volta devolvem o mesmo instante', () => {
    const iso = '2026-12-31T23:45:00.000Z';
    expect(fromBrasiliaInputValue(toBrasiliaInputValue(iso))).toBe(iso);
  });

  it('campo vazio ou inválido não vira data', () => {
    expect(toBrasiliaInputValue(null)).toBe('');
    expect(toBrasiliaInputValue('lixo')).toBe('');
    expect(fromBrasiliaInputValue('')).toBeNull();
    expect(fromBrasiliaInputValue('28/11/2026 10:00')).toBeNull();
  });

  it('formata dia e hora em português, no fuso de Brasília', () => {
    expect(formatWhen('2026-11-28T13:00:00.000Z')).toBe('sáb., 28/11 às 10:00');
    expect(formatDay('2026-11-28T13:00:00.000Z')).toBe('sábado, 28/11');
    expect(brasiliaDayKey('2026-11-29T01:30:00.000Z')).toBe('2026-11-28');
  });

  it('sabe se a data está no futuro', () => {
    const now = new Date('2026-11-27T12:00:00.000Z');
    expect(isFuture('2026-11-27T12:01:00.000Z', now)).toBe(true);
    expect(isFuture('2026-11-27T11:59:00.000Z', now)).toBe(false);
    expect(isFuture(null, now)).toBe(false);
  });
});
