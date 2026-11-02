import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { FlightPlan } from '../api';
import { FlightPlanView } from './flight-plan';

const NOW = new Date('2026-11-02T12:00:00Z');
const empty = { total: 0, items: [] };
const plan: FlightPlan = {
  generatedAt: NOW.toISOString(),
  replyNow: empty,
  followUp: empty,
  stalledCards: empty,
  scheduledToday: empty,
};

describe('FlightPlanView', () => {
  it('sem pendência, manda revisar o CRM em vez de ficar vazio', () => {
    const html = renderToStaticMarkup(<FlightPlanView plan={plan} now={NOW} />);

    expect(html).toContain('Plano de voo de hoje');
    expect(html).toContain('Nada pendente agora');
    expect(html).toContain('href="/pipelines"');
    expect(html).not.toContain('Responder agora');
  });

  it('lista clientes, cards parados e agendamentos com link e tempo parado', () => {
    const html = renderToStaticMarkup(
      <FlightPlanView
        now={NOW}
        plan={{
          ...plan,
          followUp: {
            total: 20,
            items: [{ conversationId: 'c1', contactName: 'Ana Souza', since: '2026-10-31T12:00:00Z' }],
          },
          stalledCards: {
            total: 1,
            items: [
              {
                cardId: 'k1',
                pipelineId: 'p1',
                conversationId: null,
                title: 'Disney 4 pessoas',
                contactName: 'Rui',
                pipelineName: 'Vendas',
                stageName: 'Proposta enviada',
                value: 12000,
                since: '2026-10-28T12:00:00Z',
              },
            ],
          },
          scheduledToday: {
            total: 1,
            items: [{ conversationId: 'c2', contactName: 'Lia', at: '2026-11-02T15:00:00Z', origin: 'CADENCE' }],
          },
        }}
      />,
    );

    expect(html).not.toContain('Responder agora');
    expect(html).toContain('Retomar contato');
    expect(html).toContain('sem resposta há 2 dias');
    expect(html).toContain('href="/inbox?conversationId=c1"');
    expect(html).toContain('E mais 19');
    expect(html).toContain('Proposta enviada');
    expect(html).toContain('sem mudança há 5 dias');
    expect(html).toContain('href="/pipelines?p=p1"');
    expect(html).toContain('12.000');
    expect(html).toContain('12:00');
    expect(html).toContain('cadência');
    // Numeração sem buraco quando "Responder agora" não aparece.
    expect(html).toMatch(/>1<\/span>.*Retomar contato/);
  });
});
