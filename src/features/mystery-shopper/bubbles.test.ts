import { describe, expect, it } from 'vitest';
import { toBubbles, type SimulatorMessage } from './bubbles';

const msg = (over: Partial<SimulatorMessage>): SimulatorMessage => ({
  id: 'm1',
  from: 'CLIENTE',
  text: 'Oi',
  createdAt: '2026-11-13T10:00:00Z',
  status: null,
  ...over,
});

describe('toBubbles', () => {
  it('cliente à direita e empresa à esquerda', () => {
    const bubbles = toBubbles([msg({}), msg({ id: 'm2', from: 'EMPRESA' })]);
    expect(bubbles.map((b) => b.side)).toEqual(['right', 'left']);
  });

  it('tique só nas mensagens do cliente, pelo status', () => {
    const bubbles = toBubbles([
      msg({ id: 'a', status: 'SENT' }),
      msg({ id: 'b', status: 'DELIVERED' }),
      msg({ id: 'c', status: 'read' }),
      msg({ id: 'd', status: null }),
      msg({ id: 'e', from: 'EMPRESA', status: 'READ' }),
    ]);
    expect(bubbles.map((b) => b.tick)).toEqual(['sent', 'delivered', 'read', 'delivered', 'none']);
  });

  it('mensagem do cliente que falhou mostra aviso', () => {
    expect(toBubbles([msg({ status: 'FAILED' })])[0].tick).toBe('failed');
  });

  it('não altera a lista de entrada', () => {
    const input = [msg({})];
    toBubbles(input);
    expect(input).toHaveLength(1);
  });
});
