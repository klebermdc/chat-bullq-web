import { describe, expect, it } from 'vitest';
import { roleLabel } from './role-labels';

describe('nome do cargo', () => {
  it('traduz os três cargos', () => {
    expect(roleLabel('OWNER')).toBe('Proprietário');
    expect(roleLabel('ADMIN')).toBe('Administrador');
    expect(roleLabel('AGENT')).toBe('Operador');
  });

  it('aceita caixa baixa e cai em Operador quando não conhece', () => {
    expect(roleLabel('admin')).toBe('Administrador');
    expect(roleLabel('qualquer')).toBe('Operador');
    expect(roleLabel(undefined)).toBe('Operador');
  });
});
