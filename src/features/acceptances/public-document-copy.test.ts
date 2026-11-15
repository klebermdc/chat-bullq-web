import { describe, expect, it } from 'vitest';
import { isContractView, publicDocumentCopy } from './public-document-copy';

describe('publicDocumentCopy', () => {
  it('keeps the delivery texts when kind is missing (old records)', () => {
    const copy = publicDocumentCopy({}, false);
    expect(copy.isContract).toBe(false);
    expect(copy.heading).toBe('Confirmação de entrega');
    expect(copy.confirmationLabel).toBe('Confirmo que conferi os itens acima e está tudo correto.');
    expect(copy.submitLabel).toBe('Confirmar aceite');
  });

  it('mentions the cancellation policy in the delivery declaration only when shown', () => {
    expect(publicDocumentCopy({ kind: 'DELIVERY' }, true).confirmationLabel).toContain('política de cancelamento');
  });

  it('uses the contract title as heading and contract wording', () => {
    const copy = publicDocumentCopy({ kind: 'CONTRACT', title: 'Contrato Orlando' }, false);
    expect(copy.isContract).toBe(true);
    expect(copy.heading).toBe('Contrato Orlando');
    expect(copy.signedHeading).toBe('Contrato assinado!');
    expect(copy.confirmationLabel).toBe('Li e concordo com os termos do contrato acima.');
    expect(copy.submitLabel).toBe('Assinar contrato');
  });

  it('falls back to a generic heading when the contract has no title', () => {
    expect(publicDocumentCopy({ kind: 'CONTRACT', title: '  ' }, false).heading).toBe('Contrato');
    expect(publicDocumentCopy({ kind: 'CONTRACT', title: null }, false).heading).toBe('Contrato');
  });
});

describe('isContractView', () => {
  it('is true only for CONTRACT', () => {
    expect(isContractView({ kind: 'CONTRACT' })).toBe(true);
    expect(isContractView({ kind: 'DELIVERY' })).toBe(false);
    expect(isContractView({})).toBe(false);
  });
});
