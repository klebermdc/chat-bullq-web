import { describe, expect, it } from 'vitest';
import { waitingMs } from './waiting-state';

const MIN = 60_000;
const now = Date.parse('2026-09-28T15:00:00Z');
const msg = (direction: 'INBOUND' | 'OUTBOUND', minutesAgo: number) => ({
  id: 'm1',
  type: 'TEXT',
  content: {},
  direction,
  createdAt: new Date(now - minutesAgo * MIN).toISOString(),
});

describe('waitingMs', () => {
  it('conta a espera quando a última mensagem é do cliente', () => {
    expect(waitingMs({ status: 'OPEN', lastMessage: msg('INBOUND', 40), now })).toBe(40 * MIN);
  });

  it('não conta quando alguém já respondeu e ninguém espera humano', () => {
    expect(waitingMs({ status: 'OPEN', lastMessage: msg('OUTBOUND', 40), now })).toBe(0);
  });

  it('conta desde a última mensagem da Aline quando o lead foi passado para humano', () => {
    expect(
      waitingMs({ status: 'OPEN', lastMessage: msg('OUTBOUND', 90), now, awaitingHumanReply: true }),
    ).toBe(90 * MIN);
  });

  it('conversa encerrada nunca espera', () => {
    expect(
      waitingMs({ status: 'CLOSED', lastMessage: msg('INBOUND', 90), now, awaitingHumanReply: true }),
    ).toBe(0);
  });

  it('sem mensagem não há espera', () => {
    expect(waitingMs({ status: 'OPEN', lastMessage: undefined, now, awaitingHumanReply: true })).toBe(0);
  });
});
