import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { HandoffBriefBanner, readHandoffBrief } from './handoff-brief-banner';

const BRIEF = {
  summary: 'Família quer Disney + Universal, primeira vez em Orlando.',
  destination: 'Orlando — Disney e Universal',
  travelDates: '10 a 20/07/2027',
  travelers: '2 adultos + 2 crianças (5 e 8)',
  budget: 'até R$ 25 mil',
  pendingQuestions: 'Já tem passagem?',
  at: '2026-11-07T22:00:00.000Z',
};

describe('HandoffBriefBanner', () => {
  it('mostra todos os campos da ficha e o resumo', () => {
    const html = renderToStaticMarkup(<HandoffBriefBanner brief={BRIEF} isOpen />);

    expect(html).toContain('Resumo da Aline');
    expect(html).toContain('Orlando — Disney e Universal');
    expect(html).toContain('10 a 20/07/2027');
    expect(html).toContain('2 adultos + 2 crianças (5 e 8)');
    expect(html).toContain('até R$ 25 mil');
    expect(html).toContain('Falta perguntar');
    expect(html).toContain('Já tem passagem?');
    expect(html).toContain('primeira vez em Orlando');
  });

  it('abre quando pedido e fica recolhida caso contrário', () => {
    expect(renderToStaticMarkup(<HandoffBriefBanner brief={BRIEF} isOpen />)).toContain('<details open');
    expect(renderToStaticMarkup(<HandoffBriefBanner brief={BRIEF} isOpen={false} />)).not.toContain(' open');
  });

  it('recolhida, a linha de cima já traz destino, datas e quem viaja', () => {
    const html = renderToStaticMarkup(<HandoffBriefBanner brief={BRIEF} isOpen={false} />);
    const summaryLine = html.slice(html.indexOf('<summary'), html.indexOf('</summary>'));

    expect(summaryLine).toContain('Orlando — Disney e Universal · 10 a 20/07/2027 · 2 adultos + 2 crianças (5 e 8)');
  });

  it('omite linhas de campos que a Aline não preencheu', () => {
    const html = renderToStaticMarkup(
      <HandoffBriefBanner brief={{ summary: 'Quer só ingressos.', at: BRIEF.at }} isOpen />,
    );

    expect(html).toContain('Quer só ingressos.');
    expect(html).not.toContain('Orçamento');
    expect(html).not.toContain('Falta perguntar');
  });
});

describe('readHandoffBrief', () => {
  it('lê a ficha do metadata da conversa', () => {
    expect(readHandoffBrief({ handoffBrief: BRIEF })).toEqual(BRIEF);
  });

  it('ignora metadata ausente, sem ficha ou com ficha vazia', () => {
    expect(readHandoffBrief(null)).toBeNull();
    expect(readHandoffBrief({})).toBeNull();
    expect(readHandoffBrief({ handoffBrief: { at: BRIEF.at } })).toBeNull();
    expect(readHandoffBrief({ handoffBrief: 'texto' })).toBeNull();
  });

  it('descarta campos que não são texto', () => {
    expect(readHandoffBrief({ handoffBrief: { destination: 42, summary: 'ok' } })).toEqual({ summary: 'ok' });
  });
});
