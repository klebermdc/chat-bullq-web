import { describe, expect, it } from 'vitest';
import { formatCriterion, formatDiaryDay, formatMinutes, formatWaitingSince } from './format';

describe('formatDiaryDay', () => {
  it('mostra o dia certo sem escorregar pelo fuso', () => {
    expect(formatDiaryDay('2026-10-30T00:00:00.000Z')).toBe('sexta-feira, 30 de outubro');
  });
});

describe('formatMinutes', () => {
  it('usa minutos abaixo de uma hora', () => {
    expect(formatMinutes(45)).toBe('45 min');
  });

  it('usa horas e minutos acima de uma hora', () => {
    expect(formatMinutes(75)).toBe('1h15');
    expect(formatMinutes(120)).toBe('2h');
  });

  it('mostra traço quando não há medida', () => {
    expect(formatMinutes(null)).toBe('—');
  });
});

describe('formatCriterion', () => {
  it('mostra o nome legível dos critérios conhecidos', () => {
    expect(formatCriterion('diarioProximoPasso')).toBe('Próximo passo');
  });

  it('tira o prefixo de um critério criado pelo gestor', () => {
    expect(formatCriterion('diarioVendaCasada')).toBe('VendaCasada');
  });
});

describe('formatWaitingSince', () => {
  it('mostra data e hora de São Paulo', () => {
    expect(formatWaitingSince('2026-10-31T21:30:00.000Z')).toBe('31/10, 18:30');
  });
});

describe('formatMinutes sem dado', () => {
  it('mostra traço em diário antigo, sem o campo', () => {
    expect(formatMinutes(undefined)).toBe('—');
  });
});
