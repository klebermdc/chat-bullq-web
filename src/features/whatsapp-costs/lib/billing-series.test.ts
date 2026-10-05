import { describe, expect, it } from 'vitest';
import {
  BILLING_SERIES,
  buildBillingChart,
  categoryLabel,
  describeTotals,
} from './billing-series';

const day = (
  date: string,
  billable: Record<string, number>,
  free: Record<string, number>,
  estimatedCost = 0,
) => ({ date, billable, free, estimatedCost });

describe('BILLING_SERIES', () => {
  it('define a ordem e os rótulos uma vez só', () => {
    expect(BILLING_SERIES.map((s) => s.label)).toEqual([
      'Marketing',
      'Utilidade',
      'Autenticação',
      'Atendimento (cobrado)',
      'Atendimento (grátis)',
      'Lead de anúncio (grátis)',
      'Outros',
    ]);
  });

  it('dá uma cor diferente a cada série', () => {
    const colors = BILLING_SERIES.map((s) => s.color);

    expect(new Set(colors).size).toBe(colors.length);
  });
});

describe('buildBillingChart', () => {
  it('devolve só as séries presentes, na ordem fixa', () => {
    const chart = buildBillingChart([
      day('2026-10-01', { utility: 3 }, { referral_conversion: 10, service: 7 }),
      day('2026-10-02', { marketing: 4 }, { service: 2 }),
    ]);

    expect(chart.series.map((s) => s.label)).toEqual([
      'Marketing',
      'Utilidade',
      'Atendimento (grátis)',
      'Lead de anúncio (grátis)',
    ]);
  });

  it('mantém a cor da série quando outras somem do período', () => {
    const full = buildBillingChart([day('2026-10-01', { marketing: 1, utility: 1 }, { service: 1 })]);
    const partial = buildBillingChart([day('2026-10-01', {}, { service: 1 })]);

    const colorIn = (chart: typeof full) => chart.series.find((s) => s.key === 'freeService')?.color;
    expect(colorIn(partial)).toBe(colorIn(full));
  });

  it('preenche com zero a categoria que falta no dia', () => {
    const chart = buildBillingChart([
      day('2026-10-01', { marketing: 4 }, { service: 77 }),
      day('2026-10-02', {}, {}),
    ]);

    expect(chart.rows).toEqual([
      { date: '2026-10-01', billableMarketing: 4, freeService: 77 },
      { date: '2026-10-02', billableMarketing: 0, freeService: 0 },
    ]);
  });

  it('separa atendimento cobrado de atendimento grátis', () => {
    const chart = buildBillingChart([day('2026-10-01', { service: 5 }, { service: 9 })]);

    expect(chart.rows[0]).toEqual({ date: '2026-10-01', billableService: 5, freeService: 9 });
  });

  it('junta em "Outros" o que não tem série própria', () => {
    const chart = buildBillingChart([
      day('2026-10-01', { unknown: 2, referral_conversion: 1 }, { utility: 3, novidade: 4 }),
    ]);

    expect(chart.series.map((s) => s.label)).toEqual(['Outros']);
    expect(chart.rows[0]).toEqual({ date: '2026-10-01', other: 10 });
  });

  it('soma o total de cada série no período', () => {
    const chart = buildBillingChart([
      day('2026-10-01', { marketing: 4 }, { service: 10 }),
      day('2026-10-02', { marketing: 6 }, { service: 5 }),
    ]);

    expect(chart.totals).toEqual({ billableMarketing: 10, freeService: 15 });
  });

  it('ignora série zerada no período inteiro', () => {
    const chart = buildBillingChart([day('2026-10-01', { marketing: 0 }, { service: 3 })]);

    expect(chart.series.map((s) => s.key)).toEqual(['freeService']);
  });

  it('aguenta dia sem os mapas e contagem que não é número', () => {
    const broken = [
      { date: '2026-10-01', estimatedCost: 0 },
      { date: '2026-10-02', billable: { marketing: 'x' }, free: { service: 2 }, estimatedCost: 0 },
    ] as unknown as Parameters<typeof buildBillingChart>[0];

    const chart = buildBillingChart(broken);

    expect(chart.rows).toEqual([
      { date: '2026-10-01', freeService: 0 },
      { date: '2026-10-02', freeService: 2 },
    ]);
  });

  it('devolve tudo vazio sem dias', () => {
    expect(buildBillingChart([])).toEqual({ rows: [], series: [], totals: {} });
  });
});

describe('categoryLabel', () => {
  it('traduz as categorias da Meta', () => {
    expect(categoryLabel('marketing')).toBe('Marketing');
    expect(categoryLabel('utility')).toBe('Utilidade');
    expect(categoryLabel('authentication')).toBe('Autenticação');
    expect(categoryLabel('service')).toBe('Atendimento');
    expect(categoryLabel('referral_conversion')).toBe('Lead de anúncio');
  });

  it('chama de "Outros" o que não conhece', () => {
    expect(categoryLabel('unknown')).toBe('Outros');
    expect(categoryLabel('novidade')).toBe('Outros');
  });
});

describe('describeTotals', () => {
  it('monta o resumo do gráfico para leitor de tela', () => {
    expect(
      describeTotals('Cobráveis e grátis por dia', [
        { label: 'Marketing', value: '10' },
        { label: 'Atendimento (grátis)', value: '1.500' },
      ]),
    ).toBe('Cobráveis e grátis por dia. Totais do período: Marketing 10; Atendimento (grátis) 1.500.');
  });

  it('diz que não há dados quando a lista vem vazia', () => {
    expect(describeTotals('Custo estimado por dia', [])).toBe('Custo estimado por dia. Sem dados no período.');
  });
});
