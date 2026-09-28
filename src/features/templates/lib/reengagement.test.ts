import { describe, expect, it } from 'vitest';
import { findReengagementTemplate } from './reengagement';
import type { Template } from '../services/templates.service';

const tpl = (over: Partial<Template>): Template =>
  ({
    id: 't',
    name: 'n',
    category: 'UTILITY',
    language: 'pt_BR',
    status: 'APPROVED',
    components: { body: { text: 'Oi' } },
    variableExamples: {},
    createdAt: '',
    updatedAt: '',
    ...over,
  }) as Template;

describe('findReengagementTemplate', () => {
  it('devolve o template aprovado marcado como retomada', () => {
    const marked = tpl({ id: 'b', isReengagement: true });

    expect(findReengagementTemplate([tpl({ id: 'a' }), marked])).toBe(marked);
  });

  it('ignora a marcação quando o template deixou de estar aprovado', () => {
    const paused = tpl({ id: 'b', isReengagement: true, status: 'PAUSED' });

    expect(findReengagementTemplate([paused])).toBeNull();
  });

  it('devolve null sem lista ou sem template marcado', () => {
    expect(findReengagementTemplate(undefined)).toBeNull();
    expect(findReengagementTemplate([tpl({})])).toBeNull();
  });
});
