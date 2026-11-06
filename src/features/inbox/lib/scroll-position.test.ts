import { describe, expect, it } from 'vitest';
import { isNearBottom, NEAR_BOTTOM_PX } from './scroll-position';

describe('isNearBottom', () => {
  it('colado no fim conta como no fim', () => {
    expect(isNearBottom({ scrollHeight: 5000, scrollTop: 4400, clientHeight: 600 })).toBe(true);
  });

  it('a menos da folga do fim ainda acompanha o tempo real', () => {
    const scrollTop = 5000 - 600 - (NEAR_BOTTOM_PX - 1);
    expect(isNearBottom({ scrollHeight: 5000, scrollTop, clientHeight: 600 })).toBe(true);
  });

  // Foi o caso do print: a conversa abria no meio e não era tratada como fim.
  it('no meio da conversa não está no fim', () => {
    expect(isNearBottom({ scrollHeight: 5000, scrollTop: 2000, clientHeight: 600 })).toBe(false);
  });

  it('no topo, antes da primeira rolagem, não está no fim', () => {
    expect(isNearBottom({ scrollHeight: 5000, scrollTop: 0, clientHeight: 600 })).toBe(false);
  });

  it('conversa curta, que cabe inteira na tela, está no fim', () => {
    expect(isNearBottom({ scrollHeight: 400, scrollTop: 0, clientHeight: 600 })).toBe(true);
  });
});
