import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { VisitDetail } from '../api';
import { VisitScores, VisitTranscript } from './visit-detail';

const visit: VisitDetail = {
  id: 'v1',
  status: 'DONE',
  scenario: 'família de 4',
  sellerName: 'Pedro',
  totalScore: 72,
  createdAt: '2026-11-13T10:00:00Z',
  closesAt: null,
  evaluatedAt: '2026-11-16T10:00:00Z',
  error: null,
  metrics: null,
  scores: [
    { criterion: 'primeiraResposta', label: 'Tempo da 1ª resposta', score: 2, evidence: '', comment: '5 min', measuredBy: 'CODE' },
    { criterion: 'ocultoObjecao', label: 'Objeção', score: null, evidence: '', comment: 'Não houve', measuredBy: 'AI' },
  ],
  summary: { summary: 'Bom começo.', strengths: ['Rápido'], improvements: ['Follow-up'] },
  lines: [
    { messageId: 'm1', role: 'CLIENTE', text: 'Quero Orlando', createdAt: '2026-11-13T10:00:00Z' },
    { messageId: 'm2', role: 'AUTOMATICA', text: 'Sou a Aline', createdAt: '2026-11-13T10:01:00Z' },
    { messageId: 'm3', role: 'EQUIPE', text: 'Oi, sou da equipe', createdAt: '2026-11-13T10:02:00Z' },
  ],
};

describe('VisitScores', () => {
  it('mostra nota, critérios e o que não se aplica', () => {
    const html = renderToStaticMarkup(<VisitScores visit={visit} onEvidence={() => {}} />);
    expect(html).toContain('72/100');
    expect(html).toContain('Tempo da 1ª resposta');
    expect(html).toContain('Não se aplica');
    expect(html).toContain('Follow-up');
  });
});

describe('VisitTranscript', () => {
  it('marca as mensagens automáticas e dá âncora a cada mensagem', () => {
    const html = renderToStaticMarkup(<VisitTranscript lines={visit.lines} />);
    expect(html).toContain('id="msg-m1"');
    expect(html).toContain('IA / automática');
  });

  it('rotula mensagens de outro membro da equipe', () => {
    const html = renderToStaticMarkup(<VisitTranscript lines={visit.lines} />);
    expect(html).toContain('Equipe (outro)');
    expect(html).toContain('id="msg-m3"');
  });
});
