import { describe, expect, it } from 'vitest';
import { groupFields } from './field-groups';

const PLACEHOLDERS = ['[Data]', '[Nome]', '[Valor]', '[CNPJ]', '[CPF]', '[Solto]'];

describe('groupFields', () => {
  it('orders sections Cliente, Venda, Agência, others and automatic last, keeping template order', () => {
    const sections = groupFields(PLACEHOLDERS, {
      client: ['[CPF]', '[Nome]'],
      seller: ['[Valor]'],
      agency: ['[CNPJ]', '[Fora]'],
      auto: ['[Data]'],
    });
    expect(sections.map((s) => [s.id, s.fields])).toEqual([
      ['client', ['[Nome]', '[CPF]']],
      ['seller', ['[Valor]']],
      ['agency', ['[CNPJ]']],
      ['other', ['[Solto]']],
      ['auto', ['[Data]']],
    ]);
    expect(sections[0].title).toBe('Cliente');
  });

  it('drops empty sections', () => {
    const sections = groupFields(['[Nome]'], { client: ['[Nome]'], seller: [], agency: [], auto: [] });
    expect(sections).toEqual([{ id: 'client', title: 'Cliente', fields: ['[Nome]'] }]);
  });

  it('falls back to one untitled list without groups', () => {
    expect(groupFields(PLACEHOLDERS, null)).toEqual([{ id: 'all', title: null, fields: PLACEHOLDERS }]);
    expect(groupFields([], null)).toEqual([]);
  });
});
