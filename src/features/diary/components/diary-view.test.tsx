import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { Diary } from '../api';
import { DiaryDayReport, DiaryTraining } from './diary-view';

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

const point = {
  criterion: 'diarioClareza',
  title: 'Faltou o preço por pessoa',
  explanation: 'O cliente perguntou duas vezes.',
  conversationId: 'c1',
  quote: 'O pacote fica em 4 mil no total.',
  suggestion: 'Diga o total e o valor por pessoa.',
};

const fullDiary: Diary = {
  ...diary,
  improvements: [point],
  details: {
    focus: 'Responder a Ana primeiro.',
    scores: [{ criterion: 'diarioClareza', score: 4, reason: 'Explicou o Lightning Lane.' }],
    pending: [{ conversationId: 'c1', contactName: 'Ana Souza', waitingSince: '2026-10-31T21:30:00.000Z' }],
    practice: { situation: 'Cliente pediu endereço.', reply: 'Me passe seu endereço, por favor.' },
    conversations: [
      { conversationId: 'c1', contactName: 'Ana Souza', topic: 'Troca de ingresso', assessment: 'Boa condução.', nextStep: 'Pedir o endereço.' },
    ],
  },
};

describe('DiaryTraining', () => {
  it('abre diário antigo, gerado antes dos campos novos', () => {
    const html = renderToStaticMarkup(<DiaryTraining diary={diary} />);

    expect(html).toContain('Treino de hoje');
    expect(html).toContain('Resumo do dia.');
    expect(html).not.toContain('Foco de hoje');
    expect(html).not.toContain('undefined');
  });

  it('traz foco, exercício e o que melhorar do dia anterior', () => {
    const html = renderToStaticMarkup(<DiaryTraining diary={fullDiary} />);

    expect(html).toContain('Foco de hoje');
    expect(html).toContain('Cliente pediu endereço.');
    expect(html).toContain('Para melhorar hoje');
    expect(html).toContain('Diga o total e o valor por pessoa.');
    expect(html.indexOf('Foco de hoje')).toBeLessThan(html.indexOf('Para melhorar hoje'));
  });

  it('esconde a resposta modelo até o atendente pensar na dele', () => {
    const html = renderToStaticMarkup(<DiaryTraining diary={fullDiary} />);

    expect(html).toContain('Como você responderia?');
    expect(html).toContain('Ver a resposta modelo');
    expect(html).not.toContain('Me passe seu endereço, por favor.');
  });

  it('não mostra números do dia no treino', () => {
    const html = renderToStaticMarkup(<DiaryTraining diary={fullDiary} />);

    expect(html).not.toContain('Conversas atendidas');
  });
});

describe('DiaryDayReport', () => {
  it('mostra números, notas, pendências e conversas', () => {
    const html = renderToStaticMarkup(<DiaryDayReport diary={fullDiary} />);

    expect(html).toContain('Conversas atendidas');
    expect(html).toContain('Clareza');
    expect(html).toContain('4 de 5');
    expect(html).toContain('31/10, 18:30');
    expect(html).toContain('Troca de ingresso');
    expect(html).toContain('/inbox?conversationId=c1');
  });
});
