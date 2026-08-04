import { describe, it, expect } from 'vitest';
import { normalizeHexColor } from './hex-color';

describe('normalizeHexColor', () => {
  it('aceita hex com # e mantém o formato', () => {
    expect(normalizeHexColor('#7c3aed')).toBe('#7c3aed');
  });

  it('aceita hex sem # e adiciona o prefixo', () => {
    expect(normalizeHexColor('7c3aed')).toBe('#7c3aed');
  });

  it('normaliza maiúsculas para minúsculas', () => {
    expect(normalizeHexColor('#ABCDEF')).toBe('#abcdef');
    expect(normalizeHexColor('ABCDEF')).toBe('#abcdef');
  });

  it('ignora espaços nas pontas', () => {
    expect(normalizeHexColor('  #7c3aed  ')).toBe('#7c3aed');
  });

  it('rejeita hex de 3 dígitos', () => {
    expect(normalizeHexColor('#fff')).toBeNull();
  });

  it('rejeita hex curto ou longo demais', () => {
    expect(normalizeHexColor('#7c3ae')).toBeNull();
    expect(normalizeHexColor('#7c3aedd')).toBeNull();
  });

  it('rejeita caracteres não hexadecimais', () => {
    expect(normalizeHexColor('#zzzzzz')).toBeNull();
  });

  it('rejeita texto vazio', () => {
    expect(normalizeHexColor('')).toBeNull();
    expect(normalizeHexColor('#')).toBeNull();
  });

  it('rejeita nome de cor CSS', () => {
    expect(normalizeHexColor('red')).toBeNull();
  });
});
