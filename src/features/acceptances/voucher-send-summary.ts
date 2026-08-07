import type { DeliverySendResult, VoucherSendResult } from './types';

export interface SendSummary {
  kind: 'success' | 'error';
  message: string;
}

/**
 * Traduz o retorno do `markOrderSent` na mensagem que o atendente vê.
 *
 * Duas regras governam o texto daqui:
 *
 * 1. **O que não saiu tem que doer.** Silêncio significa cliente sem o
 *    ingresso e ninguém sabendo. Por isso a conta nunca sai da lista vazia:
 *    `vouchers: []` e `vouchers: undefined` produzem o MESMO
 *    `voucherResults: []` no backend — vazio quer dizer "não tinha o que
 *    enviar", não "deu tudo certo". Quem sabe se havia voucher é o
 *    `sentCount`, contado dos arquivos que de fato foram no payload.
 *
 * 2. **Nunca afirmar entrega que não sabemos.** O backend só ENFILEIRA: o
 *    `MessagesService.send` resolve antes do gate de janela 24h/72h, que roda
 *    depois no worker e pode marcar a mensagem como FAILED. Daí "a caminho" e
 *    nunca "entregue" — a frase continua verdadeira mesmo se o envio falhar
 *    lá na frente. Pelo mesmo motivo, ausência de `linkResult` não vira
 *    sucesso: silêncio não é confirmação.
 */
export function summarizeOrderSent(params: {
  withAcceptance: boolean;
  /** Quantos vouchers foram efetivamente mandados no payload. */
  sentCount: number;
  results: VoucherSendResult[] | undefined;
  linkResult: DeliverySendResult | undefined;
  /** Anexos que nem chegaram ao storage — nunca entraram no payload. */
  failedUploads: number;
}): SendSummary {
  const { withAcceptance, sentCount, results, linkResult, failedUploads } = params;
  const failed = (results ?? []).filter((v) => !v.queued);
  const linkFailed = linkResult?.queued === false;

  // O link vem primeiro: sem ele o cliente fica com os arquivos e nenhuma
  // forma de confirmar o recebimento, e o aceite fica PENDING sem ninguém
  // saber. É pior que um voucher faltando.
  if (linkFailed || failed.length > 0 || failedUploads > 0) {
    const parts = ['Aceite criado, mas nem tudo saiu para o cliente.'];
    if (linkFailed) {
      parts.push(
        'O link de aceite NÃO saiu — sem ele o cliente não tem como confirmar a entrega. Abra a conversa e use "Reenviar link".',
      );
    }
    if (failed.length === 1) {
      parts.push(
        `O voucher "${failed[0].filename}" NÃO saiu — mande o arquivo pelo chat.`,
      );
    } else if (failed.length > 1) {
      const names = failed.map((v) => v.filename).join(', ');
      parts.push(
        `${failed.length} vouchers NÃO saíram (${names}) — mande os arquivos pelo chat.`,
      );
    }
    if (failedUploads > 0) {
      parts.push(
        failedUploads === 1
          ? '1 anexo nem chegou a subir e não foi enviado — anexe de novo pelo chat.'
          : `${failedUploads} anexos nem chegaram a subir e não foram enviados — anexe de novo pelo chat.`,
      );
    }
    return { kind: 'error', message: parts.join(' ') };
  }

  if (!withAcceptance) {
    return {
      kind: 'success',
      message: 'Pedido enviado — card movido pra etapa final. 🎫',
    };
  }

  // Pediu aceite mas o backend não reportou o link: anômalo. Não é erro (não
  // sabemos que falhou), mas também não vira "a caminho" — afirmamos só o que
  // temos e mandamos o atendente conferir.
  if (!linkResult) {
    return {
      kind: 'success',
      message:
        'Pedido enviado e aceite criado — confira na conversa se o link saiu para o cliente. 🎫',
    };
  }

  // Só cita voucher se houver arquivo no payload E confirmação do backend.
  const confirmedVouchers = sentCount > 0 && (results?.length ?? 0) > 0;
  return {
    kind: 'success',
    message: confirmedVouchers
      ? 'Pedido enviado — voucher e link de aceite a caminho do cliente. 🎫'
      : 'Pedido enviado — link de aceite a caminho do cliente. 🎫',
  };
}
