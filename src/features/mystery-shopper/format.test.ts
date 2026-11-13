import type { VisitListItem } from './api';
import { describe, expect, it } from 'vitest';
import { closesInLabel, findLineForEvidence, scoreLabel, sortVisits, STATUS_LABEL } from './format';

describe('format', () => {
  it('rótulos de status', () => {
    expect(STATUS_LABEL.OPEN).toBe('Em andamento');
    expect(STATUS_LABEL.DONE).toBe('Avaliada');
  });

  it('quanto falta para fechar', () => {
    const now = new Date('2026-11-13T10:00:00Z');
    expect(closesInLabel('2026-11-15T03:00:00Z', now)).toBe('fecha em 41h');
    expect(closesInLabel('2026-11-13T09:00:00Z', now)).toBe('fecha na próxima rodada');
    expect(closesInLabel(null, now)).toBeNull();
  });

  it('nota em palavras', () => {
    expect(scoreLabel(2)).toBe('Fez bem');
    expect(scoreLabel(null)).toBe('Não se aplica');
  });

  it('acha a mensagem do trecho de prova', () => {
    const lines = [
      { messageId: 'm1', role: 'CLIENTE' as const, text: 'Oi', createdAt: '' },
      { messageId: 'm2', role: 'VENDEDOR' as const, text: 'Quantas  pessoas vão?', createdAt: '' },
    ];
    expect(findLineForEvidence(lines, 'quantas pessoas')).toBe('m2');
    expect(findLineForEvidence(lines, '')).toBeNull();
  });

  it('ordena visitas abertas primeiro e as mais recentes antes', () => {
    const v = (id: string, status: VisitListItem['status'], createdAt: string): VisitListItem => ({
      id,
      status,
      createdAt,
      scenario: null,
      sellerName: null,
      totalScore: null,
      closesAt: null,
      evaluatedAt: null,
      error: null,
    });
    const input = [
      v('done-new', 'DONE', '2026-11-13T10:00:00Z'),
      v('open-old', 'OPEN', '2026-11-10T10:00:00Z'),
      v('done-old', 'DONE', '2026-11-11T10:00:00Z'),
      v('open-new', 'OPEN', '2026-11-12T10:00:00Z'),
    ];
    expect(sortVisits(input).map((x) => x.id)).toEqual(['open-new', 'open-old', 'done-new', 'done-old']);
    expect(input[0].id).toBe('done-new');
  });
});
