import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { Diary } from '../api';
import { DiaryView } from './diary-view';

const diary: Diary = {
  id: 'd1',
  userId: 'u1',
  day: '2026-10-31T00:00:00.000Z',
  status: 'READY',
  metrics: {
    conversations: 3,
    messagesSent: 20,
    medianReplyMinutes: 12,
    slowReplies: 0,
    unansweredAtEndOfDay: 1,
    onlineMinutes: 300,
  },
  summary: 'Resumo do dia.',
  strengths: [],
  improvements: [],
  viewedAt: null,
};

describe('DiaryView', () => {
  it('abre diário antigo, gerado antes dos campos novos', () => {
    const html = renderToStaticMarkup(<DiaryView diary={diary} />);

    expect(html).toContain('Resumo do dia.');
    expect(html).not.toContain('Foco de hoje');
    expect(html).not.toContain('undefined');
  });

  it('mostra foco, notas, pendências, treino e conversas', () => {
    const html = renderToStaticMarkup(
      <DiaryView
        diary={{
          ...diary,
          details: {
            focus: 'Responder a Ana primeiro.',
            scores: [{ criterion: 'diarioClareza', score: 4, reason: 'Explicou o Lightning Lane.' }],
            pending: [{ conversationId: 'c1', contactName: 'Ana Souza', waitingSince: '2026-10-31T21:30:00.000Z' }],
            practice: { situation: 'Cliente pediu endereço.', reply: 'Me passe seu endereço, por favor.' },
            conversations: [
              { conversationId: 'c1', contactName: 'Ana Souza', topic: 'Troca de ingresso', assessment: 'Boa condução.', nextStep: 'Pedir o endereço.' },
            ],
          },
        }}
      />,
    );

    expect(html).toContain('Foco de hoje');
    expect(html).toContain('Clareza');
    expect(html).toContain('4 de 5');
    expect(html).toContain('31/10, 18:30');
    expect(html).toContain('Treino do dia');
    expect(html).toContain('Troca de ingresso');
    expect(html).toContain('/inbox?conversationId=c1');
  });
});
