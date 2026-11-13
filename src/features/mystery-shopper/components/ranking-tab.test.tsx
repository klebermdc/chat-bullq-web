import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { RankingTable } from './ranking-tab';

describe('RankingTable', () => {
  it('mostra média, visitas e aviso de amostra pequena', () => {
    const html = renderToStaticMarkup(
      <RankingTable
        rows={[
          { sellerUserId: 'u1', sellerName: 'Renata', visits: 1, average: 90, isSmallSample: true, byCriterion: { Descoberta: 2 } },
          { sellerUserId: 'u2', sellerName: 'Pedro', visits: 4, average: 70, isSmallSample: false, byCriterion: { Descoberta: 1.5 } },
        ]}
      />,
    );
    expect(html).toContain('Renata');
    expect(html).toContain('amostra pequena');
    expect(html).toContain('1.5');
  });
});
