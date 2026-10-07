import { describe, expect, it } from 'vitest';
import { presentProposal } from './proposal-view';

const PARKS_BASE = {
  checkoutUrl: 'https://reservas.orlandofastpass.com.br/pt/checkout/abc',
  totalValue: '4500.00',
};

describe('presentProposal', () => {
  it('proposta antiga (sem kind nem details) é de parques', () => {
    const view = presentProposal(PARKS_BASE);

    expect(view).toEqual({
      kind: 'PARKS',
      hasValue: true,
      title: null,
      lines: [],
      checkoutUrl: PARKS_BASE.checkoutUrl,
      printsNote: null,
    });
  });

  it('kind PARKS explícito com details null continua de parques', () => {
    const view = presentProposal({ ...PARKS_BASE, kind: 'PARKS', details: null });

    expect(view.kind).toBe('PARKS');
    expect(view.title).toBeNull();
  });

  it('parques não mostra título nem linhas mesmo que details venha preenchido', () => {
    const view = presentProposal({
      ...PARKS_BASE,
      kind: 'PARKS',
      details: { title: 'Ingressos', lines: ['x'] },
    });

    expect(view.title).toBeNull();
    expect(view.lines).toEqual([]);
  });

  it('esconde o valor quando é 0, vazio ou inválido', () => {
    expect(presentProposal({ ...PARKS_BASE, totalValue: '0' }).hasValue).toBe(false);
    expect(presentProposal({ ...PARKS_BASE, totalValue: '0.00' }).hasValue).toBe(false);
    expect(presentProposal({ ...PARKS_BASE, totalValue: 0 }).hasValue).toBe(false);
    expect(presentProposal({ ...PARKS_BASE, totalValue: null }).hasValue).toBe(false);
    expect(presentProposal({ ...PARKS_BASE, totalValue: 'abc' }).hasValue).toBe(false);
  });

  it('mostra o valor quando é maior que zero (string ou número)', () => {
    expect(presentProposal({ ...PARKS_BASE, totalValue: '0.01' }).hasValue).toBe(true);
    expect(presentProposal({ ...PARKS_BASE, totalValue: 1200 }).hasValue).toBe(true);
  });

  it('OTHER mostra título e linhas de details', () => {
    const view = presentProposal({
      kind: 'OTHER',
      checkoutUrl: '',
      totalValue: '1890.50',
      details: {
        title: 'Aluguel de carro — Alamo',
        lines: ['SUV intermediário', '  ', '10 a 17/08/2026'],
      },
    });

    expect(view.kind).toBe('OTHER');
    expect(view.title).toBe('Aluguel de carro — Alamo');
    expect(view.lines).toEqual(['SUV intermediário', '10 a 17/08/2026']);
    expect(view.hasValue).toBe(true);
    expect(view.checkoutUrl).toBeNull();
  });

  it('OTHER sem título cai num rótulo genérico e sem valor informado esconde o valor', () => {
    const view = presentProposal({
      kind: 'OTHER',
      checkoutUrl: '',
      totalValue: 0,
      details: { lines: ['Seguro viagem 10 dias'] },
    });

    expect(view.title).toBe('Outros produtos');
    expect(view.hasValue).toBe(false);
  });

  it('OTHER com details null não quebra', () => {
    const view = presentProposal({ kind: 'OTHER', checkoutUrl: '', totalValue: '0', details: null });

    expect(view.title).toBe('Outros produtos');
    expect(view.lines).toEqual([]);
    expect(view.printsNote).toBeNull();
  });

  it('OTHER mantém o link quando checkoutUrl vem preenchido', () => {
    const view = presentProposal({
      kind: 'OTHER',
      checkoutUrl: ' https://exemplo.com/checkout ',
      totalValue: '10',
      details: { title: 'Carro' },
    });

    expect(view.checkoutUrl).toBe('https://exemplo.com/checkout');
  });

  it('link em branco vira null', () => {
    expect(presentProposal({ ...PARKS_BASE, checkoutUrl: '   ' }).checkoutUrl).toBeNull();
    expect(presentProposal({ ...PARKS_BASE, checkoutUrl: null }).checkoutUrl).toBeNull();
  });

  it('avisa quantos prints foram enviados, no singular e no plural', () => {
    const one = presentProposal({ ...PARKS_BASE, details: { images: ['a'] } });
    const many = presentProposal({ ...PARKS_BASE, kind: 'OTHER', details: { images: ['a', 'b', 'c'] } });
    const none = presentProposal({ ...PARKS_BASE, details: { images: [] } });

    expect(one.printsNote).toBe('1 print enviado');
    expect(many.printsNote).toBe('3 prints enviados');
    expect(none.printsNote).toBeNull();
  });

  it('ignora lines e images que não são lista (dado externo)', () => {
    const view = presentProposal({
      kind: 'OTHER',
      checkoutUrl: '',
      totalValue: '0',
      details: { title: 'Carro', lines: 'x', images: 3 } as never,
    });

    expect(view.lines).toEqual([]);
    expect(view.printsNote).toBeNull();
  });
});
