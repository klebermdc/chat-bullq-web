import { beforeEach, describe, expect, it } from 'vitest';
import { clearAllDraftsForTest, loadDraft, saveDraft } from './drafts';

describe('rascunho por conversa', () => {
  beforeEach(() => clearAllDraftsForTest());

  it('devolve o texto guardado da mesma conversa', () => {
    saveDraft('c1', 'Oi, tudo bem? Sobre os ingressos');
    expect(loadDraft('c1')).toBe('Oi, tudo bem? Sobre os ingressos');
  });

  it('não mistura conversas', () => {
    saveDraft('c1', 'para o c1');
    expect(loadDraft('c2')).toBe('');
  });

  it('apaga o rascunho quando o campo fica vazio', () => {
    saveDraft('c1', 'texto');
    saveDraft('c1', '   ');
    expect(loadDraft('c1')).toBe('');
  });

  it('ignora conversa sem id', () => {
    saveDraft(undefined, 'x');
    expect(loadDraft(undefined)).toBe('');
  });
});
