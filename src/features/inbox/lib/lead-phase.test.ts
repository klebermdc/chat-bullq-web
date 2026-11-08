import { describe, expect, it } from 'vitest';
import { leadPhaseOf, type LeadPhaseInput } from './lead-phase';

const distribute = [{ stage: { name: 'Distribuir' } }];
const collecting = [{ stage: { name: 'Coletando Informação' } }];

function conv(patch: Partial<LeadPhaseInput>): LeadPhaseInput {
  return {
    status: 'OPEN',
    assignedToId: null,
    awaitingHumanReply: false,
    aiEnabled: null,
    cards: [],
    ...patch,
  };
}

describe('leadPhaseOf', () => {
  it('sem atendente, IA ligada e sem esperar humano → Com a IA', () => {
    expect(leadPhaseOf(conv({ cards: collecting }))).toBe('sdr');
  });

  it('sem atendente na etapa Distribuir → Na fila', () => {
    expect(leadPhaseOf(conv({ cards: distribute, awaitingHumanReply: true }))).toBe('queue');
  });

  it('esperando humano fora de Distribuir não é mais "Com a IA"', () => {
    expect(leadPhaseOf(conv({ awaitingHumanReply: true }))).toBeNull();
  });

  it('IA desligada na conversa não é "Com a IA"', () => {
    expect(leadPhaseOf(conv({ aiEnabled: false }))).toBeNull();
  });

  it('com atendente ainda em Distribuir → Iniciar atendimento', () => {
    expect(leadPhaseOf(conv({ assignedToId: 'u1', cards: distribute }))).toBe('start');
  });

  it('com atendente fora de Distribuir ou fechada → sem fase', () => {
    expect(leadPhaseOf(conv({ assignedToId: 'u1' }))).toBeNull();
    expect(leadPhaseOf(conv({ status: 'CLOSED' }))).toBeNull();
  });
});
