import { describe, expect, it } from 'vitest';
import { toHistory, type ConsultTurn } from './api';

describe('toHistory', () => {
  it('devolve a sugestão no histórico para a IA lembrar o que já propôs', () => {
    const turns: ConsultTurn[] = [
      { role: 'user', content: 'e o visto?' },
      { role: 'assistant', content: 'Precisa do eTA.', suggestion: 'Oi! Para o Canadá precisa do eTA.' },
    ];
    expect(toHistory(turns)).toEqual([
      { role: 'user', content: 'e o visto?' },
      { role: 'assistant', content: 'Precisa do eTA.\n\nSUGESTÃO PARA O CLIENTE:\nOi! Para o Canadá precisa do eTA.' },
    ]);
  });

  it('manda só os 10 turnos mais recentes', () => {
    const turns: ConsultTurn[] = Array.from({ length: 14 }, (_, i) => ({ role: 'user', content: `p${i}` }));
    const out = toHistory(turns);
    expect(out).toHaveLength(10);
    expect(out[0].content).toBe('p4');
  });
});
