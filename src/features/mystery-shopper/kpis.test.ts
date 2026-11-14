import { describe, expect, it } from 'vitest';
import {
  canGoNext,
  currentMonth,
  formatAverage,
  formatMinutes,
  formatPct,
  formatScore,
  heatClass,
  heatLevel,
  monthLabel,
  scoreDelta,
  shiftMonth,
  trendView,
} from './kpis';

const NOV_13 = new Date(2026, 10, 13, 12);

describe('navegação de mês', () => {
  it('usa o mês corrente no formato YYYY-MM', () => {
    expect(currentMonth(NOV_13)).toBe('2026-11');
  });

  it('volta e avança atravessando o ano', () => {
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
    expect(shiftMonth('2026-11', -13)).toBe('2025-10');
  });

  it('rejeita mês fora do formato', () => {
    expect(() => shiftMonth('2026-1', 1)).toThrow('Mês inválido');
  });

  it('escreve o mês por extenso', () => {
    expect(monthLabel('2026-11')).toBe('novembro de 2026');
  });

  it('não avança além do mês corrente', () => {
    expect(canGoNext('2026-11', NOV_13)).toBe(false);
    expect(canGoNext('2026-10', NOV_13)).toBe(true);
  });
});

describe('mapa de calor', () => {
  it('separa grave, atenção e bom pelos limites', () => {
    expect(heatLevel(0.5)).toBe('urgent');
    expect(heatLevel(0.75)).toBe('warning');
    expect(heatLevel(1.49)).toBe('warning');
    expect(heatLevel(1.5)).toBe('success');
    expect(heatLevel(null)).toBe('none');
  });

  it('usa os tokens de estado', () => {
    expect(heatClass(0)).toContain('text-urgent-ink');
    expect(heatClass(1)).toContain('bg-warning-wash');
    expect(heatClass(2)).toContain('text-success-ink');
    expect(heatClass(null)).toBe('text-muted-foreground');
  });
});

describe('tendência e variação', () => {
  it('traduz a tendência em seta com texto para leitor de tela', () => {
    expect(trendView('UP')).toMatchObject({ symbol: '▲', className: 'text-success-ink' });
    expect(trendView('DOWN')?.label).toContain('caiu');
    expect(trendView(null)).toBeNull();
  });

  it('mostra a diferença contra o mês anterior', () => {
    expect(scoreDelta(75, 70)).toBe('▲ 5 vs mês anterior');
    expect(scoreDelta(60.4, 70)).toBe('▼ 10 vs mês anterior');
    expect(scoreDelta(70, 70)).toBe('= mês anterior');
    expect(scoreDelta(70, null)).toBeNull();
    expect(scoreDelta(null, 70)).toBeNull();
  });
});

describe('formatos', () => {
  it('mostra traço quando não há dado', () => {
    expect(formatPct(null)).toBe('—');
    expect(formatMinutes(null)).toBe('—');
    expect(formatScore(null)).toBe('—');
    expect(formatAverage(null)).toBe('—');
  });

  it('formata números presentes', () => {
    expect(formatPct(40)).toBe('40%');
    expect(formatMinutes(12.6)).toBe('13 min');
    expect(formatScore(71.6)).toBe('72');
    expect(formatAverage(1.25)).toBe('1,3');
  });
});
