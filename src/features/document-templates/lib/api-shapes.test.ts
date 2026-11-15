import { describe, expect, it } from 'vitest';
import { pdfFileName, readMessageFromBody, readMissingFromBody, unwrapEnvelope } from './api-shapes';

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
