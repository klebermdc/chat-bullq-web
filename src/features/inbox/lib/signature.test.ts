import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { canSendUnsigned, loadUnsigned, saveUnsigned } from './signature';

function fakeStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  };
}

describe('assinatura do vendedor', () => {
  beforeEach(() => vi.stubGlobal('window', { localStorage: fakeStorage() }));
  afterEach(() => vi.unstubAllGlobals());

  it('storage bloqueado não quebra: assinatura fica ligada', () => {
    vi.stubGlobal('window', {
      get localStorage(): Storage {
        throw new Error('blocked');
      },
    });
    saveUnsigned('u1', true);
    expect(loadUnsigned('u1')).toBe(false);
  });

  it('só ADM e Proprietário podem desligar', () => {
    expect(canSendUnsigned('OWNER')).toBe(true);
    expect(canSendUnsigned('ADMIN')).toBe(true);
    expect(canSendUnsigned('AGENT')).toBe(false);
    expect(canSendUnsigned(null)).toBe(false);
  });

  it('começa ligada (com assinatura)', () => {
    expect(loadUnsigned('u1')).toBe(false);
  });

  it('lembra a escolha por usuário', () => {
    saveUnsigned('u1', true);
    expect(loadUnsigned('u1')).toBe(true);
    expect(loadUnsigned('u2')).toBe(false);
  });

  it('religar volta ao padrão', () => {
    saveUnsigned('u1', true);
    saveUnsigned('u1', false);
    expect(loadUnsigned('u1')).toBe(false);
  });

  it('sem usuário não guarda nada', () => {
    saveUnsigned(undefined, true);
    expect(loadUnsigned(undefined)).toBe(false);
  });
});
