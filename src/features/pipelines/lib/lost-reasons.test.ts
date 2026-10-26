import { describe, expect, it } from 'vitest';
import { isNoteRequired, lostReasonLabel, LOST_REASONS } from './lost-reasons';

describe('lost-reasons', () => {
  it('só "Outro" exige texto', () => {
    const required = LOST_REASONS.filter((r) => isNoteRequired(r.code)).map((r) => r.code);
    expect(required).toEqual(['OTHER']);
  });

  it('traduz o código para o rótulo', () => {
    expect(lostReasonLabel('COMPETITOR')).toBe('Comprou com concorrente');
  });

  it('código desconhecido ou vazio não quebra a tela', () => {
    expect(lostReasonLabel('XYZ')).toBe('Motivo não informado');
    expect(lostReasonLabel(null)).toBe('Motivo não informado');
  });
});
