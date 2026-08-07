import { describe, expect, it } from 'vitest';
import { summarizeOrderSent } from './voucher-send-summary';

describe('summarizeOrderSent', () => {
  it('reclama alto e nomeia o arquivo quando um voucher não foi enviado', () => {
    const summary = summarizeOrderSent({
      withAcceptance: true,
      sentCount: 1,
      results: [{ filename: 'voucher.pdf', sent: false, error: 'timeout' }],
    });

    expect(summary.kind).toBe('error');
    expect(summary.message).toContain('voucher.pdf');
  });

  it('nomeia todos os arquivos quando mais de um voucher falha', () => {
    const summary = summarizeOrderSent({
      withAcceptance: true,
      sentCount: 3,
      results: [
        { filename: 'a.pdf', sent: true },
        { filename: 'b.pdf', sent: false },
        { filename: 'c.pdf', sent: false },
      ],
    });

    expect(summary.kind).toBe('error');
    expect(summary.message).toContain('b.pdf, c.pdf');
    expect(summary.message).toContain('2 vouchers');
  });

  it('não diz que o voucher foi enviado quando não havia voucher nenhum', () => {
    const summary = summarizeOrderSent({
      withAcceptance: true,
      sentCount: 0,
      results: [],
    });

    expect(summary.kind).toBe('success');
    expect(summary.message).not.toContain('voucher');
  });

  it('confirma o voucher quando o backend confirmou o envio', () => {
    const summary = summarizeOrderSent({
      withAcceptance: true,
      sentCount: 1,
      results: [{ filename: 'voucher.pdf', sent: true }],
    });

    expect(summary).toEqual({
      kind: 'success',
      message: 'Pedido enviado — voucher e link de aceite enviados ao cliente. 🎫',
    });
  });

  it('não afirma o envio do voucher quando o backend não devolveu resultado', () => {
    const summary = summarizeOrderSent({
      withAcceptance: true,
      sentCount: 2,
      results: undefined,
    });

    expect(summary.kind).toBe('success');
    expect(summary.message).not.toContain('voucher');
  });

  it('fala só do card quando o atendente pulou o aceite', () => {
    const summary = summarizeOrderSent({
      withAcceptance: false,
      sentCount: 0,
      results: [],
    });

    expect(summary).toEqual({
      kind: 'success',
      message: 'Pedido enviado — card movido pra etapa final. 🎫',
    });
  });
});
