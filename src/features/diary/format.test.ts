import { describe, expect, it } from 'vitest';
import { formatDiaryDay, formatMinutes } from './format';

describe('formatDiaryDay', () => {
  it('mostra o dia certo sem escorregar pelo fuso', () => {
    expect(formatDiaryDay('2026-10-30T00:00:00.000Z')).toBe('sexta-feira, 30 de outubro');
  });
});

describe('formatMinutes', () => {
  it('usa minutos abaixo de uma hora', () => {
    expect(formatMinutes(45)).toBe('45 min');
  });

  it('usa horas e minutos acima de uma hora', () => {
    expect(formatMinutes(75)).toBe('1h15');
    expect(formatMinutes(120)).toBe('2h');
  });

  it('mostra traço quando não há medida', () => {
    expect(formatMinutes(null)).toBe('—');
  });
});
