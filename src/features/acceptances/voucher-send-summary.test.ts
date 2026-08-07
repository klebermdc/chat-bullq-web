import { describe, expect, it } from 'vitest';
import { summarizeOrderSent } from './voucher-send-summary';

const QUEUED = { queued: true, messageId: 'msg-link' };

describe('summarizeOrderSent', () => {
  it('reclama alto e nomeia o arquivo quando um voucher não saiu', () => {
    const summary = summarizeOrderSent({
      withAcceptance: true,
      sentCount: 1,
      results: [{ filename: 'voucher.pdf', queued: false, error: 'timeout' }],
      linkResult: QUEUED,
    });

    expect(summary.kind).toBe('error');
    expect(summary.message).toContain('voucher.pdf');
  });

  it('nomeia todos os arquivos quando mais de um voucher falha', () => {
    const summary = summarizeOrderSent({
      withAcceptance: true,
      sentCount: 3,
      results: [
        { filename: 'a.pdf', queued: true, messageId: 'm1' },
        { filename: 'b.pdf', queued: false },
        { filename: 'c.pdf', queued: false },
      ],
      linkResult: QUEUED,
    });

    expect(summary.kind).toBe('error');
    expect(summary.message).toContain('b.pdf, c.pdf');
    expect(summary.message).toContain('2 vouchers');
  });

  it('avisa do link primeiro quando ele não saiu, por ser o pior desfecho', () => {
    const summary = summarizeOrderSent({
      withAcceptance: true,
      sentCount: 1,
      results: [{ filename: 'a.pdf', queued: false }],
      linkResult: { queued: false, error: 'Não foi possível enviar agora.' },
    });

    expect(summary.kind).toBe('error');
    expect(summary.message.indexOf('link de aceite NÃO saiu')).toBeLessThan(
      summary.message.indexOf('a.pdf'),
    );
  });

  it('não diz que o voucher saiu quando não havia voucher nenhum', () => {
    const summary = summarizeOrderSent({
      withAcceptance: true,
      sentCount: 0,
      results: [],
      linkResult: QUEUED,
    });

    expect(summary.kind).toBe('success');
    expect(summary.message).not.toContain('voucher');
  });

  it('fala em "a caminho", nunca em entrega confirmada', () => {
    const summary = summarizeOrderSent({
      withAcceptance: true,
      sentCount: 1,
      results: [{ filename: 'voucher.pdf', queued: true, messageId: 'm1' }],
      linkResult: QUEUED,
    });

    expect(summary).toEqual({
      kind: 'success',
      message: 'Pedido enviado — voucher e link de aceite a caminho do cliente. 🎫',
    });
  });

  it('não afirma o envio do voucher quando o backend não devolveu resultado', () => {
    const summary = summarizeOrderSent({
      withAcceptance: true,
      sentCount: 2,
      results: undefined,
      linkResult: QUEUED,
    });

    expect(summary.kind).toBe('success');
    expect(summary.message).not.toContain('voucher');
  });

  // Silêncio não é confirmação: sem `linkResult` não sabemos que falhou (então
  // não gritamos) nem que saiu (então não prometemos).
  it('não promete o link quando o backend não reportou o resultado dele', () => {
    const summary = summarizeOrderSent({
      withAcceptance: true,
      sentCount: 1,
      results: [{ filename: 'a.pdf', queued: true, messageId: 'm1' }],
      linkResult: undefined,
    });

    expect(summary.kind).toBe('success');
    expect(summary.message).not.toContain('a caminho');
    expect(summary.message).not.toContain('voucher');
    expect(summary.message).toContain('confira na conversa');
  });

  it('fala só do card quando o atendente pulou o aceite', () => {
    const summary = summarizeOrderSent({
      withAcceptance: false,
      sentCount: 0,
      results: undefined,
      linkResult: undefined,
    });

    expect(summary).toEqual({
      kind: 'success',
      message: 'Pedido enviado — card movido pra etapa final. 🎫',
    });
  });
});
