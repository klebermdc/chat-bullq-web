import { renderToStaticMarkup } from 'react-dom/server';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import type { Appointment } from '../api';
import { AppointmentItem } from './appointment-item';

const base: Appointment = {
  id: 'ap1',
  ownerUserId: 'renata',
  contactId: 'c1',
  conversationId: 'cv1',
  cardId: null,
  startsAt: '2026-11-16T18:00:00.000Z',
  durationMin: 15,
  kind: 'RETORNO_LIGACAO',
  status: 'MARCADO',
  source: 'ALINE_VOZ',
  notes: 'quer falar das datas',
  owner: { id: 'renata', name: 'Renata' },
  contact: { id: 'c1', name: 'Kleber', phone: null },
};

const html = (item: Appointment, showOwner = false) =>
  renderToStaticMarkup(
    <QueryClientProvider client={new QueryClient()}>
      <ul>
        <AppointmentItem item={item} showOwner={showOwner} onReschedule={() => {}} />
      </ul>
    </QueryClientProvider>,
  );

describe('AppointmentItem', () => {
  it('mostra horário, cliente com link para a conversa, origem da Aline e ações', () => {
    const out = html(base);
    expect(out).toContain('15:00');
    expect(out).toContain('href="/inbox?conversationId=cv1"');
    expect(out).toContain('Aline (ligação)');
    expect(out).toContain('quer falar das datas');
    for (const acao of ['Feito', 'Não atendeu', 'Remarcar', 'Cancelar']) expect(out).toContain(acao);
  });

  it('compromisso encerrado não tem ações; gestão vê o nome do vendedor', () => {
    const out = html({ ...base, status: 'FEITO', source: 'MANUAL' }, true);
    expect(out).not.toContain('Remarcar');
    expect(out).not.toContain('Aline (ligação)');
    expect(out).toContain('Renata');
  });
});
