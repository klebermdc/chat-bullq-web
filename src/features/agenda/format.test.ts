import { describe, expect, it } from 'vitest';
import { dayKey, dayLabel, groupByDay, slotLabel, timeLabel, weekRange } from './format';
import type { Appointment } from './api';

const ap = (id: string, startsAt: string) => ({ id, startsAt }) as Appointment;

describe('agenda/format', () => {
  it('dia em Brasília (23h de domingo em SP ainda é domingo)', () => {
    expect(dayKey(new Date('2026-11-16T02:30:00Z'))).toBe('2026-11-15');
  });

  it('semana de segunda a domingo, com navegação', () => {
    const ref = new Date('2026-11-13T15:00:00-03:00'); // sexta
    expect(weekRange(ref)).toMatchObject({ from: '2026-11-09', to: '2026-11-15' });
    expect(weekRange(ref, 1)).toMatchObject({ from: '2026-11-16', to: '2026-11-22' });
    expect(weekRange(new Date('2026-11-15T12:00:00-03:00')).from).toBe('2026-11-09'); // domingo fica na semana anterior
  });

  it('agrupa por dia em ordem de horário', () => {
    const g = groupByDay([ap('b', '2026-11-16T18:00:00Z'), ap('a', '2026-11-16T13:00:00Z'), ap('c', '2026-11-17T13:00:00Z')]);
    expect([...g.keys()]).toEqual(['2026-11-16', '2026-11-17']);
    expect(g.get('2026-11-16')!.map((x) => x.id)).toEqual(['a', 'b']);
  });

  it('rótulos em português no fuso de Brasília', () => {
    expect(timeLabel('2026-11-16T18:00:00Z')).toBe('15:00');
    expect(dayLabel('2026-11-16')).toBe('segunda-feira, 16/11');
    expect(slotLabel('2026-11-16T18:00:00Z')).toBe('seg., 16/11 às 15:00');
  });
});
