import { describe, expect, it } from 'vitest';
import { fieldOrigin, fieldOrigins, mergeLayers, pickAiValues, type FillLayers } from './field-origin';

const PLACEHOLDERS = ['[Nome]', '[CPF]', '[RG]', '[Data]', '[CNPJ]', '[Destino]'];

const layers = (overrides: Partial<FillLayers> = {}): FillLayers => ({
  dateValues: { '[Data]': '15/11/2026' },
  autofillValues: { '[Nome]': 'Ana', '[CPF]': '123', '[CNPJ]': '00.000' },
  autofillSources: { '[Nome]': 'contact', '[CPF]': 'saved', '[CNPJ]': 'agency' },
  aiValues: {},
  typedValues: {},
  ...overrides,
});

describe('pickAiValues', () => {
  it('fills only empty template fields and never overwrites existing values', () => {
    const current = { '[Nome]': 'Ana', '[CPF]': '  ', '[RG]': '' };
    const ai = { '[Nome]': 'Outra', '[CPF]': ' 999 ', '[RG]': '12', '[Fora do modelo]': 'x', '[Destino]': '  ' };
    expect(pickAiValues(PLACEHOLDERS, current, ai)).toEqual({ '[CPF]': '999', '[RG]': '12' });
  });

  it('returns nothing when the AI found nothing new', () => {
    expect(pickAiValues(PLACEHOLDERS, { '[Nome]': 'Ana' }, { '[Nome]': 'Ana' })).toEqual({});
  });
});

describe('mergeLayers', () => {
  it('stacks date < ai < autofill < typed', () => {
    const merged = mergeLayers(layers({ aiValues: { '[RG]': '12' }, typedValues: { '[Nome]': 'Bia', '[CPF]': '' } }));
    expect(merged).toMatchObject({ '[Data]': '15/11/2026', '[Nome]': 'Bia', '[CPF]': '', '[RG]': '12', '[CNPJ]': '00.000' });
  });
});

describe('autofill arriving after the AI', () => {
  it('wins over the AI value and shows the autofill source', () => {
    const l = layers({
      aiValues: { '[CPF]': '999', '[RG]': '12' },
      autofillValues: { '[CPF]': '123' },
      autofillSources: { '[CPF]': 'saved' },
    });
    expect(mergeLayers(l)['[CPF]']).toBe('123');
    expect(fieldOrigin('[CPF]', l)).toBe('saved');
    expect(fieldOrigin('[RG]', l)).toBe('ai');
  });

  it('never beats what the seller typed', () => {
    const l = layers({ aiValues: { '[CPF]': '999' }, typedValues: { '[CPF]': '555' } });
    expect(mergeLayers(l)['[CPF]']).toBe('555');
    expect(fieldOrigin('[CPF]', l)).toBeNull();
  });
});

describe('fieldOrigin', () => {
  it('reports the source of each suggested value', () => {
    const l = layers({ aiValues: { '[RG]': '12' } });
    expect(fieldOrigins(PLACEHOLDERS, l)).toEqual({
      '[Nome]': 'contact',
      '[CPF]': 'saved',
      '[RG]': 'ai',
      '[Data]': 'date',
      '[CNPJ]': 'agency',
    });
  });

  it('clears the origin once the seller edits the field, even to empty', () => {
    const l = layers({ aiValues: { '[RG]': '12' }, typedValues: { '[RG]': '13', '[Nome]': '' } });
    expect(fieldOrigin('[RG]', l)).toBeNull();
    expect(fieldOrigin('[Nome]', l)).toBeNull();
  });

  it('has no badge for an autofill value without a known source', () => {
    expect(fieldOrigin('[Nome]', layers({ autofillSources: {} }))).toBeNull();
  });
});
