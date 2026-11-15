import { describe, expect, it } from 'vitest';
import {
  extractPlaceholders,
  isLongPlaceholder,
  mergeValues,
  missingPlaceholders,
  normalizeValues,
  placeholderLabel,
  splitByPlaceholders,
  toPlaceholderKey,
} from './placeholders';

describe('extractPlaceholders', () => {
  it('returns placeholders in order of appearance without duplicates', () => {
    const body = 'Eu, [Nome do Cliente], CPF [CPF], confirmo. Assina: [Nome do Cliente].';
    expect(extractPlaceholders(body)).toEqual(['[Nome do Cliente]', '[CPF]']);
  });

  it('ignores empty brackets, nested brackets and placeholders spanning lines', () => {
    const body = 'a [] b [ ] c [[x]] d [quebra\nde linha] e [Valor]';
    expect(extractPlaceholders(body)).toEqual(['[x]', '[Valor]']);
  });

  it('does not swallow a paragraph when a bracket is left open', () => {
    const body = `Cláusula [1 ${'x'.repeat(200)}] fim [Data]`;
    expect(extractPlaceholders(body)).toEqual(['[Data]']);
  });

  it('returns the same result on consecutive calls (no regex state leak)', () => {
    expect(extractPlaceholders('[A] [B]')).toEqual(['[A]', '[B]']);
    expect(extractPlaceholders('[A] [B]')).toEqual(['[A]', '[B]']);
  });
});

describe('placeholderLabel / toPlaceholderKey', () => {
  it('strips the brackets and surrounding spaces', () => {
    expect(placeholderLabel('[ Nome do Cliente ]')).toBe('Nome do Cliente');
    expect(placeholderLabel('Sem colchete')).toBe('Sem colchete');
  });

  it('wraps a bare name in brackets and keeps an existing placeholder as is', () => {
    expect(toPlaceholderKey('Nome do Cliente')).toBe('[Nome do Cliente]');
    expect(toPlaceholderKey('[CPF]')).toBe('[CPF]');
  });
});

describe('isLongPlaceholder', () => {
  it('detects description-like fields regardless of accents', () => {
    expect(isLongPlaceholder('[Descrição dos serviços]')).toBe(true);
    expect(isLongPlaceholder('[Observações]')).toBe(true);
    expect(isLongPlaceholder('[Endereço]')).toBe(true);
    expect(isLongPlaceholder('[CPF]')).toBe(false);
  });
});

describe('missingPlaceholders', () => {
  it('treats absent and whitespace-only values as missing', () => {
    const values = { '[A]': 'ok', '[B]': '   ' };
    expect(missingPlaceholders(['[A]', '[B]', '[C]'], values)).toEqual(['[B]', '[C]']);
  });
});

describe('normalizeValues', () => {
  it('accepts keys with or without brackets and drops empty or non-string values', () => {
    const raw = { 'Nome do Cliente': 'Ana', '[CPF]': '123', Vazio: '  ', Numero: 3 };
    expect(normalizeValues(raw)).toEqual({ '[Nome do Cliente]': 'Ana', '[CPF]': '123' });
  });

  it('returns an empty object for missing input', () => {
    expect(normalizeValues(null)).toEqual({});
  });
});

describe('mergeValues', () => {
  it('never overwrites what the user already typed', () => {
    const current = { '[A]': 'digitado', '[B]': '' };
    const suggested = { '[A]': 'sugerido', '[B]': 'sugerido B' };
    expect(mergeValues(current, suggested)).toEqual({ '[A]': 'digitado', '[B]': 'sugerido B' });
  });

  it('does not mutate its inputs', () => {
    const current = { '[A]': 'x' };
    const suggested = { '[B]': 'y' };
    mergeValues(current, suggested);
    expect(current).toEqual({ '[A]': 'x' });
    expect(suggested).toEqual({ '[B]': 'y' });
  });
});

describe('splitByPlaceholders', () => {
  it('splits text into plain and placeholder segments', () => {
    expect(splitByPlaceholders('Olá [Nome], tudo bem?')).toEqual([
      { text: 'Olá ', isPlaceholder: false },
      { text: '[Nome]', isPlaceholder: true },
      { text: ', tudo bem?', isPlaceholder: false },
    ]);
  });

  it('only highlights the requested placeholders when a list is given', () => {
    expect(splitByPlaceholders('[A] e [B]', ['[B]'])).toEqual([
      { text: '[A] e ', isPlaceholder: false },
      { text: '[B]', isPlaceholder: true },
    ]);
  });
});
