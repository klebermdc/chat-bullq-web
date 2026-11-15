import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { DocumentTemplateSummary } from '../types';
import { TemplatePicker } from './template-picker';

const template = (id: string, title: string, category: string | null, fields = 1): DocumentTemplateSummary => ({
  id,
  title,
  category,
  audience: 'CLIENT',
  isActive: true,
  placeholders: Array.from({ length: fields }, (_, i) => `[Campo ${i}]`),
});

const html = (templates: DocumentTemplateSummary[], selectedId: string | null = null, extra = {}) =>
  renderToStaticMarkup(
    <TemplatePicker templates={templates} isLoading={false} isError={false} selectedId={selectedId} onSelect={() => {}} {...extra} />,
  );

describe('TemplatePicker', () => {
  it('groups templates by category, uncategorized last', () => {
    const out = html([template('1', 'Avulso', null), template('2', 'Pacote', 'Viagens', 3)]);
    expect(out.indexOf('Viagens')).toBeLessThan(out.indexOf('Sem categoria'));
    expect(out).toContain('3 campos');
    expect(out).toContain('1 campo');
  });

  it('marks the selected template', () => {
    const out = html([template('1', 'Pacote', 'Viagens')], '1');
    expect(out).toContain('aria-checked="true"');
  });

  it('shows an empty state pointing to the settings page when there is no template', () => {
    expect(html([])).toContain('Modelos de documentos');
  });

  it('shows the loading state', () => {
    expect(html([], null, { isLoading: true })).toContain('Carregando modelos');
  });
});
