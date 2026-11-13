import { describe, expect, it } from 'vitest';
import { accessDecision } from './access';

describe('accessDecision', () => {
  it('espera enquanto carrega, mesmo sem permissão', () => {
    expect(accessDecision({ allowed: false, isLoading: true })).toBe('loading');
    expect(accessDecision({ allowed: true, isLoading: true })).toBe('loading');
  });
  it('redireciona só quando terminou e negou', () => {
    expect(accessDecision({ allowed: false, isLoading: false })).toBe('redirect');
  });
  it('mostra quando liberado', () => {
    expect(accessDecision({ allowed: true, isLoading: false })).toBe('show');
  });
});
