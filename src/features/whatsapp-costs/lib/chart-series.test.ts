import { describe, expect, it } from 'vitest';
import { buildDailyChart, describeChart, seriesTotal } from './chart-series';
import { makeDay } from './test-fixtures';

const DAILY = [
  makeDay({
    date: '2026-11-01',
    cost: 3.5,
    billable: 12,
    free: 40,
    byCategory: {
      SERVICE: { volume: 10, cost: 0.35 },
      MARKETING: { volume: 2, cost: 0.64 },
      REFERRAL_X: { volume: 1, cost: 0.5 },
    },
  }),
  makeDay({ date: '2026-11-02' }),
];

describe('buildDailyChart', () => {
  it('na visão de custo empilha só o dinheiro, por categoria, sem a série grátis', () => {
    const chart = buildDailyChart(DAILY, 'cost');

    expect(chart.series.map((s) => s.key)).toEqual(['SERVICE', 'MARKETING', 'OTHER']);
    expect(chart.rows[0]).toEqual({ date: '2026-11-01', SERVICE: 0.35, MARKETING: 0.64, OTHER: 0.5 });
  });

  it('dias zerados entram com zero nas séries presentes', () => {
    const chart = buildDailyChart(DAILY, 'cost');

    expect(chart.rows[1]).toEqual({ date: '2026-11-02', SERVICE: 0, MARKETING: 0, OTHER: 0 });
  });

  it('na visão de mensagens soma as grátis como série própria, por último', () => {
    const chart = buildDailyChart(DAILY, 'volume');

    expect(chart.series.map((s) => s.key)).toEqual(['SERVICE', 'MARKETING', 'OTHER', 'FREE']);
    expect(chart.rows[0]).toMatchObject({ SERVICE: 10, MARKETING: 2, OTHER: 1, FREE: 40 });
  });

  it('sem nenhum dia com valor, não há séries', () => {
    expect(buildDailyChart([makeDay()], 'cost').series).toEqual([]);
  });

  it('ignora valores que não são número', () => {
    const broken = makeDay({ free: 1, byCategory: { SERVICE: { volume: Number.NaN, cost: 2 } } });

    // NaN vira zero, e série que soma zero no período não aparece.
    expect(buildDailyChart([broken], 'volume').rows[0]).toEqual({ date: '2026-11-01', FREE: 1 });
  });
});

describe('describeChart e seriesTotal', () => {
  it('resume o gráfico em texto para leitor de tela', () => {
    expect(describeChart('Custo por dia', [{ label: 'Marketing', value: 'R$ 1,00' }])).toBe(
      'Custo por dia. Totais do período: Marketing R$ 1,00.',
    );
    expect(describeChart('Custo por dia', [])).toBe('Custo por dia. Sem dados no período.');
  });

  it('soma uma série no período', () => {
    const chart = buildDailyChart(DAILY, 'volume');
    expect(seriesTotal(chart.rows, 'FREE')).toBe(40);
  });
});
