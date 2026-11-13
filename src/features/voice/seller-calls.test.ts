import { describe, expect, it } from 'vitest';
import { blockedReason, callAction, formatDuration, phaseFromSipStatus } from './seller-calls';

const base = { canCall: false, canRequest: false, permission: 'no_permission', windowOpen: true, dialerConfigured: true };

describe('ligação do vendedor', () => {
  it('estado a partir do sip.callStatus do cliente', () => {
    expect(phaseFromSipStatus(undefined, false)).toBe('conectando');
    expect(phaseFromSipStatus('dialing', true)).toBe('chamando');
    expect(phaseFromSipStatus('ringing', true)).toBe('chamando');
    expect(phaseFromSipStatus('active', true)).toBe('em_ligacao');
    expect(phaseFromSipStatus('hangup', true)).toBe('encerrada');
  });

  it('decide entre ligar, pedir permissão ou avisar', () => {
    expect(callAction({ ...base, canCall: true })).toBe('LIGAR');
    expect(callAction({ ...base, canRequest: true })).toBe('PEDIR_PERMISSAO');
    expect(callAction(base)).toBe('AVISAR');
  });

  it('explica por que não dá para ligar', () => {
    expect(blockedReason({ ...base, dialerConfigured: false })).toContain('não está configurada');
    expect(blockedReason({ ...base, windowOpen: false })).toContain('janela de 24h');
    expect(blockedReason(base)).toContain('1 pedido por dia');
  });

  it('formata a duração', () => {
    expect(formatDuration(0)).toBe('0:00');
    expect(formatDuration(125)).toBe('2:05');
  });
});
