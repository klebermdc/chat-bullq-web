import { describe, expect, it } from 'vitest';
import { submitLabel } from './submit-label';

describe('submitLabel', () => {
  it('fluxo de prints segue como antes', () => {
    expect(submitLabel({ phase: 'idle', hasReview: false, isLinkFlow: true, isStoreFlow: false })).toBe('Ler prints');
    expect(submitLabel({ phase: 'uploading', hasReview: false, isLinkFlow: true, isStoreFlow: false })).toBe('Enviando prints…');
    expect(submitLabel({ phase: 'reading', hasReview: false, isLinkFlow: true, isStoreFlow: false })).toBe('Lendo prints…');
    expect(submitLabel({ phase: 'idle', hasReview: true, isLinkFlow: true, isStoreFlow: false })).toBe('Enviar link ao cliente');
    expect(submitLabel({ phase: 'idle', hasReview: true, isLinkFlow: false, isStoreFlow: false })).toBe('Enviar ao cliente');
  });

  it('com o link da loja, lê o link', () => {
    expect(submitLabel({ phase: 'idle', hasReview: false, isLinkFlow: true, isStoreFlow: true })).toBe('Ler link');
    expect(submitLabel({ phase: 'reading', hasReview: false, isLinkFlow: true, isStoreFlow: true })).toBe('Lendo o link da loja…');
    expect(submitLabel({ phase: 'idle', hasReview: true, isLinkFlow: true, isStoreFlow: true })).toBe('Enviar link ao cliente');
  });
});
