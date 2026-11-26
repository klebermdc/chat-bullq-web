import { describe, expect, it } from 'vitest';
import {
  ALREADY_CLIENT,
  choiceForKey,
  isNoteRequired,
  lostReasonLabel,
  LOST_REASONS,
} from './lost-reasons';

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

  it('teclas 1–6 escolhem o motivo e a 7 é "Já é cliente"', () => {
    expect(choiceForKey('1')).toBe('NO_REPLY');
    expect(choiceForKey('6')).toBe('OTHER');
    expect(choiceForKey('7')).toBe(ALREADY_CLIENT);
  });

  it('outras teclas não escolhem nada', () => {
    expect(choiceForKey('0')).toBeNull();
    expect(choiceForKey('8')).toBeNull();
    expect(choiceForKey('a')).toBeNull();
  });

  it('"Já é cliente" não é motivo de perda', () => {
    expect(LOST_REASONS.some((r) => (r.code as string) === ALREADY_CLIENT)).toBe(false);
  });
});
