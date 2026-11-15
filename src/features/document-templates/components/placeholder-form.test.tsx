import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { PlaceholderForm } from './placeholder-form';

const PLACEHOLDERS = ['[Nome do Cliente]', '[Descrição do pacote]', '[CPF]'];

const html = (values: Record<string, string>, focusMissingSignal = 0) =>
  renderToStaticMarkup(
    <PlaceholderForm placeholders={PLACEHOLDERS} values={values} onChange={() => {}} focusMissingSignal={focusMissingSignal} />,
  );

describe('PlaceholderForm', () => {
  it('renders one required field per placeholder, labelled without brackets', () => {
    const out = html({});
    expect(out).toContain('Nome do Cliente');
    expect(out).not.toContain('[Nome do Cliente]');
    expect((out.match(/aria-required="true"/g) ?? []).length).toBe(PLACEHOLDERS.length);
  });

  it('uses a textarea for long fields and a text input for the others', () => {
    const out = html({});
    expect((out.match(/<textarea/g) ?? []).length).toBe(1);
    expect((out.match(/<input/g) ?? []).length).toBe(2);
  });

  it('counts the empty fields and shows the prefilled values', () => {
    const out = html({ '[Nome do Cliente]': 'Ana Souza' });
    expect(out).toContain('2 campos ainda vazios.');
    expect(out).toContain('value="Ana Souza"');
  });

  it('marks empty fields as invalid only after a send attempt', () => {
    expect(html({})).not.toContain('aria-invalid');
    expect((html({ '[CPF]': '123' }, 1).match(/aria-invalid="true"/g) ?? []).length).toBe(2);
  });

  it('says when everything is filled', () => {
    const all = Object.fromEntries(PLACEHOLDERS.map((p) => [p, 'x']));
    expect(html(all)).toContain('Todos os campos preenchidos.');
  });

  it('explains when the template has no fields', () => {
    const out = renderToStaticMarkup(<PlaceholderForm placeholders={[]} values={{}} onChange={() => {}} />);
    expect(out).toContain('não tem campos');
  });
});
