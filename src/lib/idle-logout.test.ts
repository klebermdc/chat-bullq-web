import { describe, expect, it } from 'vitest';
import { IDLE_LOGOUT_MS, IDLE_WARNING_MS, getIdleStatus, parseLastActivity } from './idle-logout';

const NOW = 1_800_000_000_000;

describe('getIdleStatus', () => {
  it('fica ativo sem registro de uso (sessão recém-aberta)', () => {
    expect(getIdleStatus(null, NOW)).toEqual({ kind: 'active' });
  });

  it('fica ativo antes da faixa de aviso', () => {
    expect(getIdleStatus(NOW - 5 * 60_000, NOW)).toEqual({ kind: 'active' });
  });

  it('avisa no último minuto com os segundos restantes', () => {
    const last = NOW - (IDLE_LOGOUT_MS - 30_000);
    expect(getIdleStatus(last, NOW)).toEqual({ kind: 'warning', secondsLeft: 30 });
  });

  it('avisa exatamente no início da faixa', () => {
    const last = NOW - (IDLE_LOGOUT_MS - IDLE_WARNING_MS);
    expect(getIdleStatus(last, NOW)).toEqual({ kind: 'warning', secondsLeft: 60 });
  });

  it('expira aos 15 minutos sem uso', () => {
    expect(getIdleStatus(NOW - IDLE_LOGOUT_MS, NOW)).toEqual({ kind: 'expired' });
  });

  it('expira quando o navegador volta horas depois', () => {
    expect(getIdleStatus(NOW - 10 * 60 * 60_000, NOW)).toEqual({ kind: 'expired' });
  });
});

describe('parseLastActivity', () => {
  it('lê o timestamp gravado', () => {
    expect(parseLastActivity(String(NOW))).toBe(NOW);
  });

  it('ignora valor ausente ou inválido', () => {
    expect(parseLastActivity(null)).toBeNull();
    expect(parseLastActivity('abc')).toBeNull();
    expect(parseLastActivity('0')).toBeNull();
    expect(parseLastActivity('-5')).toBeNull();
  });
});
