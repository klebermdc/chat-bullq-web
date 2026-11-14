import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { MysteryShopperKpis, SellerKpi } from '../api';
import { KpisContent } from './kpis-tab';
import { SellerKpiTable } from './seller-kpi-table';

const seller: SellerKpi = {
  sellerUserId: 'u1',
  sellerName: 'Renata',
  visits: 1,
  averageScore: 64,
  previousAverageScore: 70,
  trend: 'DOWN',
  isSmallSample: true,
  byCriterion: { descoberta: 0.5, proposta: null },
  medianFirstReplyMinutes: 12,
  proposalPct: 100,
  followUpPct: 0,
  topImprovements: ['Fazer follow-up em 24h'],
};

const kpis: MysteryShopperKpis = {
  month: '2026-11',
  criteria: [
    { criterion: 'descoberta', label: 'Descoberta' },
    { criterion: 'proposta', label: 'Proposta' },
  ],
  overall: {
    visits: 4,
    openVisits: 2,
    averageScore: 75,
    previousAverageScore: 70,
    approvedPct: 50,
    medianFirstReplyMinutes: null,
    within15MinPct: 25,
    funnel: [{ key: 'responded', label: 'Respondeu', reached: 3, total: 4, pct: 75 }],
    criteriaAverages: [{ criterion: 'descoberta', label: 'Descoberta', average: 0.5, rated: 4 }],
    weakestCriterion: { criterion: 'descoberta', label: 'Descoberta', average: 0.5 },
    criticalVisits: [{ visitId: 'v9', sellerName: 'Pedro', reason: 'NO_REPLY', evaluatedAt: '2026-11-10T12:00:00Z' }],
  },
  sellers: [seller],
};

const render = (data: MysteryShopperKpis) => renderToStaticMarkup(<KpisContent data={data} onOpenVisit={() => {}} />);

describe('KpisContent', () => {
  it('mostra os cartões com variação e visitas em andamento', () => {
    const html = render(kpis);
    expect(html).toContain('Visitas avaliadas');
    expect(html).toContain('2 em andamento');
    expect(html).toContain('▲ 5 vs mês anterior');
    expect(html).toContain('Respondidas em até 15 min');
  });

  it('mostra funil, ponto fraco e erros graves', () => {
    const html = render(kpis);
    expect(html).toContain('Onde o cliente se perde');
    expect(html).toContain('3/4');
    expect(html).toContain('média 0,5/2');
    expect(html).toContain('Não respondeu');
    expect(html).toContain('Abrir visita de Pedro');
  });

  it('mostra traço quando não há dado', () => {
    expect(render(kpis)).toContain('—');
  });

  it('mostra estado vazio sem visitas no mês', () => {
    const empty = { ...kpis, overall: { ...kpis.overall, visits: 0, openVisits: 0 }, sellers: [] };
    expect(render(empty)).toContain('Sem visitas avaliadas neste mês');
  });
});

describe('SellerKpiTable', () => {
  it('colore os critérios, marca tendência e amostra pequena', () => {
    const html = renderToStaticMarkup(<SellerKpiTable sellers={[seller]} criteria={kpis.criteria} />);
    expect(html).toContain('amostra pequena');
    expect(html).toContain('caiu em relação ao mês anterior');
    expect(html).toContain('bg-urgent-wash');
    expect(html).toContain('aria-expanded="false"');
    expect(html).not.toContain('Pontos a melhorar');
  });

  it('abre a ficha do vendedor', () => {
    const html = renderToStaticMarkup(
      <SellerKpiTable sellers={[seller]} criteria={kpis.criteria} initialOpenId="u1" />,
    );
    expect(html).toContain('aria-expanded="true"');
    expect(html).toContain('Pontos a melhorar que se repetem');
    expect(html).toContain('Fazer follow-up em 24h');
    expect(html).toContain('100%');
  });
});
