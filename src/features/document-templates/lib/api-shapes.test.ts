import { describe, expect, it } from 'vitest';
import {
  parseAiFill,
  parseAutofill,
  parseDataRequest,
  parseFieldDefaults,
  pdfFileName,
  readMessageFromBody,
  readMissingFromBody,
  unwrapEnvelope,
} from './api-shapes';

describe('unwrapEnvelope', () => {
  it('unwraps the {data, meta} envelope and keeps a null payload', () => {
    expect(unwrapEnvelope({ data: [1], meta: {} })).toEqual([1]);
    expect(unwrapEnvelope({ data: null })).toBeNull();
    expect(unwrapEnvelope([2])).toEqual([2]);
  });
});

describe('readMissingFromBody', () => {
  it('finds the list at the top level, inside message or inside data', () => {
    expect(readMissingFromBody({ missing: ['[A]'] })).toEqual(['[A]']);
    expect(readMissingFromBody({ message: { message: 'x', missing: ['[B]'] } })).toEqual(['[B]']);
    expect(readMissingFromBody({ data: { missing: ['[C]'] } })).toEqual(['[C]']);
  });

  it('returns null when there is no usable list', () => {
    expect(readMissingFromBody({ message: 'Campos faltando' })).toBeNull();
    expect(readMissingFromBody({ missing: [] })).toBeNull();
    expect(readMissingFromBody(null)).toBeNull();
  });
});

describe('readMessageFromBody', () => {
  it('reads string, list and nested messages', () => {
    expect(readMessageFromBody({ message: 'oi' })).toBe('oi');
    expect(readMessageFromBody({ message: ['primeiro', 'segundo'] })).toBe('primeiro');
    expect(readMessageFromBody({ message: { message: 'dentro' } })).toBe('dentro');
    expect(readMessageFromBody({})).toBeNull();
  });
});

describe('pdfFileName', () => {
  it('removes characters that are invalid in file names', () => {
    expect(pdfFileName('Contrato: Orlando/2026')).toBe('Contrato- Orlando-2026.pdf');
  });

  it('falls back to a generic name for an empty title', () => {
    expect(pdfFileName('  ')).toBe('documento.pdf');
  });
});

describe('parseAutofill', () => {
  it('reads values, sources and groups, normalizing keys to brackets', () => {
    const out = parseAutofill({
      values: { 'Nome do Cliente': 'Ana', '[CPF]': '123', '[Vazio]': '  ', '[Num]': 7 },
      sources: { '[Nome do Cliente]': 'contact', CPF: 'saved', '[X]': 'hacker' },
      groups: { client: ['[Nome do Cliente]', 'CPF', 3], seller: [], agency: ['[CNPJ]'], auto: ['[Data]'] },
    });
    expect(out.values).toEqual({ '[Nome do Cliente]': 'Ana', '[CPF]': '123' });
    expect(out.sources).toEqual({ '[Nome do Cliente]': 'contact', '[CPF]': 'saved' });
    expect(out.groups).toEqual({ client: ['[Nome do Cliente]', '[CPF]'], seller: [], agency: ['[CNPJ]'], auto: ['[Data]'] });
  });

  it('accepts the old shape (only values) and garbage', () => {
    expect(parseAutofill({ values: { '[A]': 'a' } })).toEqual({ values: { '[A]': 'a' }, sources: {}, groups: null });
    expect(parseAutofill(null)).toEqual({ values: {}, sources: {}, groups: null });
    expect(parseAutofill({ values: [], groups: 'x' }).groups).toBeNull();
  });
});

describe('parseDataRequest', () => {
  it('reads text, fields and the send result', () => {
    expect(parseDataRequest({ text: 'Oi', fields: ['CPF'], send: { queued: false, error: 'janela fechada' } })).toEqual({
      text: 'Oi',
      fields: ['[CPF]'],
      send: { queued: false, messageId: undefined, error: 'janela fechada' },
    });
  });

  it('falls back to empty text and null send', () => {
    expect(parseDataRequest({ send: { queued: 'yes' } })).toEqual({ text: '', fields: [], send: null });
  });
});

describe('parseAiFill', () => {
  it('reads values and filled, deriving filled from values when absent', () => {
    expect(parseAiFill({ values: { '[RG]': '12', '[CPF]': '' }, filled: ['[RG]'] })).toEqual({
      values: { '[RG]': '12' },
      filled: ['[RG]'],
    });
    expect(parseAiFill({ values: { RG: '12' } }).filled).toEqual(['[RG]']);
    expect(parseAiFill(undefined)).toEqual({ values: {}, filled: [] });
  });
});

describe('parseFieldDefaults', () => {
  it('keeps string values and deduplicates suggested fields', () => {
    expect(
      parseFieldDefaults({ values: { '[CNPJ]': '1', '[Bad]': 2 }, suggestedFields: ['[CNPJ]', '[CNPJ]', '', 5, '[Razão social]'] }),
    ).toEqual({ values: { '[CNPJ]': '1' }, suggestedFields: ['[CNPJ]', '[Razão social]'] });
    expect(parseFieldDefaults(null)).toEqual({ values: {}, suggestedFields: [] });
  });
});
