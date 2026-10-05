import { describe, expect, it } from 'vitest';
import { getInitials } from './initials';

describe('iniciais do avatar', () => {
  it('usa a primeira e a última palavra do nome', () => {
    expect(getInitials('Maria Silva')).toBe('MS');
    expect(getInitials('Ana Beatriz Moura')).toBe('AM');
  });

  it('usa só uma letra quando o nome tem uma palavra', () => {
    expect(getInitials('Kleber')).toBe('K');
  });

  it('ignora espaços sobrando e caixa', () => {
    expect(getInitials('  joão   pedro  ')).toBe('JP');
  });

  it('não devolve iniciais para telefone ou nome vazio', () => {
    expect(getInitials('+55 11 90000-1016')).toBe('');
    expect(getInitials('')).toBe('');
    expect(getInitials(null)).toBe('');
    expect(getInitials(undefined)).toBe('');
  });
});
