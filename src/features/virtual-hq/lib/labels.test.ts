import { describe, expect, it } from 'vitest';
import { formatDay, intentLabel, presenceLabel, waitedLabel } from './labels';

describe('rótulos', () => {
  it('presença em português', () => {
    expect(presenceLabel('online')).toBe('Na mesa');
    expect(presenceLabel('away')).toBe('Ausente');
    expect(presenceLabel('offline')).toBe('Fora');
  });

  it('tempo de espera curto e legível', () => {
    const now = new Date('2026-11-22T15:00:00Z');
    expect(waitedLabel('2026-11-22T14:55:00Z', now)).toBe('5 min');
    expect(waitedLabel('2026-11-22T12:30:00Z', now)).toBe('2h30');
    expect(waitedLabel('2026-11-22T13:00:00Z', now)).toBe('2h');
    expect(waitedLabel(null, now)).toBeNull();
  });

  it('faixa da nota de intenção em português', () => {
    expect(intentLabel('hot')).toBe('Quente');
    expect(intentLabel('warm')).toBe('Morno');
    expect(intentLabel('cold')).toBe('Frio');
    expect(intentLabel(undefined)).toBeNull();
    expect(intentLabel('xyz' as never)).toBeNull();
  });

  it('data curta dd/mm', () => {
    expect(formatDay('2026-11-22')).toBe('22/11');
  });
});
