import { describe, expect, it } from 'vitest';
import { mergeVoucherItems, pickOrderRef } from './voucher-merge';

describe('mergeVoucherItems', () => {
  it('mantém os itens do rascunho quando o voucher não traz nada', () => {
    const draft = [{ description: 'Magic Kingdom' }];

    expect(mergeVoucherItems(draft, [])).toEqual(draft);
  });

  it('substitui o item do rascunho quando descrição e data coincidem', () => {
    const draft = [{ description: 'Magic Kingdom', qty: 2 }];
    const fromVoucher = [
      { description: 'magic  kingdom', qty: 3, ref: 'JTT-1', note: 'Válido até 31/12' },
    ];

    expect(mergeVoucherItems(draft, fromVoucher)).toEqual([
      { description: 'magic  kingdom', qty: 3, ref: 'JTT-1', note: 'Válido até 31/12' },
    ]);
  });

  it('trata acento e caixa como o mesmo item', () => {
    const draft = [{ description: 'Ingresso Único' }];
    const fromVoucher = [{ description: 'ingresso unico', qty: 1 }];

    expect(mergeVoucherItems(draft, fromVoucher)).toHaveLength(1);
  });

  it('não funde itens com a mesma descrição e datas diferentes', () => {
    const draft = [{ description: 'Universal', date: '14/09/2026' }];
    const fromVoucher = [{ description: 'Universal', date: '15/09/2026' }];

    expect(mergeVoucherItems(draft, fromVoucher)).toHaveLength(2);
  });

  it('acrescenta item novo preservando a ordem do rascunho primeiro', () => {
    const draft = [{ description: 'A' }];
    const fromVoucher = [{ description: 'B' }];

    expect(mergeVoucherItems(draft, fromVoucher).map((i) => i.description)).toEqual(['A', 'B']);
  });

  it('não muta os arrays recebidos', () => {
    const draft = [{ description: 'A' }];
    const fromVoucher = [{ description: 'B' }];

    mergeVoucherItems(draft, fromVoucher);

    expect(draft).toEqual([{ description: 'A' }]);
    expect(fromVoucher).toEqual([{ description: 'B' }]);
  });
});

describe('pickOrderRef', () => {
  it('devolve o primeiro não-vazio sem conflito', () => {
    expect(pickOrderRef([null, '61293', '61293'])).toEqual({
      orderRef: '61293',
      conflict: false,
    });
  });

  it('sinaliza conflito quando dois vouchers trazem pedidos diferentes', () => {
    expect(pickOrderRef(['61293', '99999'])).toEqual({
      orderRef: '61293',
      conflict: true,
    });
  });

  it('devolve null quando nenhum voucher traz pedido', () => {
    expect(pickOrderRef([null, null])).toEqual({ orderRef: null, conflict: false });
  });
});
