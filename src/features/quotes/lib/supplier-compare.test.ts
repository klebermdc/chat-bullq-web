import { describe, expect, it } from 'vitest';
import { emptyDraftItem, type QuoteDraft } from './quote-draft';
import { EMPTY_SUPPLIER_COMPARE, applySupplierChoice, compareSuppliers, offerInstallmentsCount } from './supplier-compare';
import type { StoreOffer } from '../types';

const OFFER: StoreOffer = { pixTotal: 9000, installmentsTotal: 10000, installmentsCount: 10 };

const DRAFT: QuoteDraft = {
  customerName: 'Ana',
  items: [emptyDraftItem('k1')],
  total: '10000,00',
  pixTotal: '9000,00',
  installmentsCount: '10',
  notes: '',
  storeUrl: 'https://reservas.orlandofastpass.com.br/pt/checkout/abc',
};

describe('compareSuppliers', () => {
  it('sem valor da Azul, a Just Travel fica com os dois', () => {
    const c = compareSuppliers(OFFER, EMPTY_SUPPLIER_COMPARE);
    expect(c.pix).toEqual({ justTravel: 9000, azul: null, chosen: 'JUST_TRAVEL', value: 9000 });
    expect(c.installments).toEqual({ justTravel: 10000, azul: null, chosen: 'JUST_TRAVEL', value: 10000 });
  });

  it('escolhe o menor 10x e o menor Pix, cada um de quem for mais barato', () => {
    const c = compareSuppliers(OFFER, { ...EMPTY_SUPPLIER_COMPARE, azulInstallmentsTotal: '9.500,00', azulPixTotal: '9.200,00' });
    expect(c.installments.chosen).toBe('AZUL');
    expect(c.installments.value).toBe(9500);
    expect(c.pix.chosen).toBe('JUST_TRAVEL');
    expect(c.pix.value).toBe(9000);
  });

  it('empate fica com a Just Travel', () => {
    const c = compareSuppliers(OFFER, { ...EMPTY_SUPPLIER_COMPARE, azulInstallmentsTotal: '10000' });
    expect(c.installments.chosen).toBe('JUST_TRAVEL');
  });

  it('valor da Azul ilegível ou zero é ignorado', () => {
    const c = compareSuppliers(OFFER, { ...EMPTY_SUPPLIER_COMPARE, azulInstallmentsTotal: 'abc', azulPixTotal: '0' });
    expect(c.installments.azul).toBeNull();
    expect(c.pix.azul).toBeNull();
    expect(c.installments.chosen).toBe('JUST_TRAVEL');
  });

  it('a escolha do atendente vence a automática', () => {
    const c = compareSuppliers(OFFER, {
      ...EMPTY_SUPPLIER_COMPARE,
      azulInstallmentsTotal: '9.500,00',
      installmentsPick: 'JUST_TRAVEL',
    });
    expect(c.installments.chosen).toBe('JUST_TRAVEL');
    expect(c.installments.value).toBe(10000);
  });

  it('escolha de um lado sem valor volta para a automática', () => {
    const c = compareSuppliers(OFFER, { ...EMPTY_SUPPLIER_COMPARE, pixPick: 'AZUL' });
    expect(c.pix.chosen).toBe('JUST_TRAVEL');
  });

  it('loja sem Pix: usa o Pix da Azul quando houver, senão nenhum', () => {
    const offer = { ...OFFER, pixTotal: null };
    expect(compareSuppliers(offer, EMPTY_SUPPLIER_COMPARE).pix).toEqual({ justTravel: null, azul: null, chosen: null, value: null });
    expect(compareSuppliers(offer, { ...EMPTY_SUPPLIER_COMPARE, azulPixTotal: '9100' }).pix.chosen).toBe('AZUL');
  });
});

describe('applySupplierChoice', () => {
  it('leva o menor Pix e o menor 10x ao rascunho, sem mexer no original', () => {
    const snapshot = structuredClone(DRAFT);
    const c = compareSuppliers(OFFER, { ...EMPTY_SUPPLIER_COMPARE, azulInstallmentsTotal: '9.500,5' });
    const next = applySupplierChoice(DRAFT, OFFER, c);
    expect(next).not.toBe(DRAFT);
    expect(next.total).toBe('9500,50');
    expect(next.pixTotal).toBe('9000,00');
    expect(next.installmentsCount).toBe('10');
    expect(next.items).toBe(DRAFT.items);
    expect(DRAFT).toEqual(snapshot);
  });

  it('sem valor escolhido mantém o que já estava no rascunho', () => {
    const offer: StoreOffer = { pixTotal: null, installmentsTotal: null, installmentsCount: null };
    const next = applySupplierChoice(DRAFT, offer, compareSuppliers(offer, EMPTY_SUPPLIER_COMPARE));
    expect(next.total).toBe(DRAFT.total);
    expect(next.pixTotal).toBe(DRAFT.pixTotal);
    expect(next.installmentsCount).toBe(DRAFT.installmentsCount);
  });

  it('usa o número de parcelas da loja', () => {
    const offer = { ...OFFER, installmentsCount: 6 };
    const next = applySupplierChoice({ ...DRAFT, installmentsCount: '' }, offer, compareSuppliers(offer, EMPTY_SUPPLIER_COMPARE));
    expect(next.installmentsCount).toBe('6');
  });
});

describe('offerInstallmentsCount', () => {
  it('padrão 10x e nunca passa do máximo', () => {
    expect(offerInstallmentsCount({ ...OFFER, installmentsCount: null })).toBe(10);
    expect(offerInstallmentsCount({ ...OFFER, installmentsCount: 12 })).toBe(10);
    expect(offerInstallmentsCount({ ...OFFER, installmentsCount: 0 })).toBe(10);
    expect(offerInstallmentsCount({ ...OFFER, installmentsCount: 3 })).toBe(3);
  });
});
