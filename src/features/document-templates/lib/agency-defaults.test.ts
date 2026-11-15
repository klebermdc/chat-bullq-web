import { describe, expect, it } from 'vitest';
import { buildAgencyDefaultsForm } from './agency-defaults';

describe('buildAgencyDefaultsForm', () => {
  it('lists suggested fields first, then saved extras, matching keys by label', () => {
    const form = buildAgencyDefaultsForm({
      suggestedFields: ['[Razão Social]', '[CNPJ da Agência]'],
      values: { 'CNPJ da Agencia': '12.345', '[Cadastur]': 'abc' },
    });
    expect(form.fields).toEqual(['[Razão Social]', '[CNPJ da Agência]', '[Cadastur]']);
    expect(form.draft).toEqual({ '[Razão Social]': '', '[CNPJ da Agência]': '12.345', '[Cadastur]': 'abc' });
  });
});
