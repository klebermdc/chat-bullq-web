import { describe, expect, it } from 'vitest';
import { isReasonValid } from './support-ticket-options';

describe('isReasonValid', () => {
  it('exige ao menos 5 letras de motivo, sem contar espaços', () => {
    expect(isReasonValid('   VIP  ')).toBe(false);
    expect(isReasonValid('Cliente VIP')).toBe(true);
  });

  it('recusa motivo acima de 500 caracteres', () => {
    expect(isReasonValid('x'.repeat(500))).toBe(true);
    expect(isReasonValid('x'.repeat(501))).toBe(false);
  });
});
