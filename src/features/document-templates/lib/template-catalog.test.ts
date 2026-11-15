import { describe, expect, it } from 'vitest';
import type { DocumentTemplateSummary } from '../types';
import { NO_CATEGORY_LABEL, filterTemplates, groupByCategory, listCategories } from './template-catalog';

function template(id: string, title: string, category: string | null): DocumentTemplateSummary {
  return { id, title, category, audience: 'CLIENT', isActive: true, placeholders: [] };
}

const TEMPLATES = [
  template('1', 'Pacote Orlando', 'Viagens'),
  template('2', 'Avulso', null),
  template('3', 'Aéreo', 'Viagens'),
  template('4', 'Autorização de menor', 'Documentos'),
  template('5', 'Outro', '  '),
];

describe('groupByCategory', () => {
  it('groups alphabetically, with uncategorized templates last', () => {
    const groups = groupByCategory(TEMPLATES);
    expect(groups.map((g) => g.category)).toEqual(['Documentos', 'Viagens', NO_CATEGORY_LABEL]);
  });

  it('sorts templates by title inside each group', () => {
    const viagens = groupByCategory(TEMPLATES).find((g) => g.category === 'Viagens');
    expect(viagens?.templates.map((t) => t.title)).toEqual(['Aéreo', 'Pacote Orlando']);
  });

  it('does not mutate the input list', () => {
    const copy = [...TEMPLATES];
    groupByCategory(TEMPLATES);
    expect(TEMPLATES).toEqual(copy);
  });
});

describe('filterTemplates', () => {
  it('matches title or category ignoring accents and case', () => {
    expect(filterTemplates(TEMPLATES, 'aereo').map((t) => t.id)).toEqual(['3']);
    expect(filterTemplates(TEMPLATES, 'VIAGENS').map((t) => t.id)).toEqual(['1', '3']);
  });

  it('returns everything for an empty query', () => {
    expect(filterTemplates(TEMPLATES, '  ')).toHaveLength(TEMPLATES.length);
  });
});

describe('listCategories', () => {
  it('lists unique non-empty categories in order', () => {
    expect(listCategories(TEMPLATES)).toEqual(['Documentos', 'Viagens']);
  });
});
