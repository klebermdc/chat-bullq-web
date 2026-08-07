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

  // Regressão: o cliente recebeu dois ingressos do mesmo parque no mesmo dia,
  // cada um com seu localizador, e assinou um aceite que mostrava só um deles.
  // Nenhum item do voucher pode ser engolido por outro item do voucher.
  it('preserva os dois localizadores quando o voucher traz o mesmo item duas vezes', () => {
    const draft = [{ description: 'Magic Kingdom', date: '15/09/2026' }];
    const fromVoucher = [
      { description: 'Magic Kingdom', date: '15/09/2026', ref: 'JTT-1' },
      { description: 'magic  kingdom', date: '15/09/2026', ref: 'JTT-2' },
    ];

    expect(mergeVoucherItems(draft, fromVoucher).map((i) => i.ref)).toEqual(['JTT-1', 'JTT-2']);
  });

  it('funde item sem data do rascunho com o item datado do voucher', () => {
    const draft = [{ description: 'Universal', qty: 2 }];
    const fromVoucher = [{ description: 'Universal', qty: 2, date: '15/09/2026', ref: 'UNI-9' }];

    expect(mergeVoucherItems(draft, fromVoucher)).toEqual([
      { description: 'Universal', qty: 2, date: '15/09/2026', ref: 'UNI-9' },
    ]);
  });

  it('mantém a ordem: rascunho primeiro, depois o resto do voucher na ordem original', () => {
    const draft = [{ description: 'A' }, { description: 'B' }];
    const fromVoucher = [
      { description: 'C' },
      { description: 'B', ref: 'B-1' },
      { description: 'D' },
    ];

    const merged = mergeVoucherItems(draft, fromVoucher);

    expect(merged.map((i) => i.description)).toEqual(['A', 'B', 'C', 'D']);
    expect(merged[1].ref).toBe('B-1');
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
