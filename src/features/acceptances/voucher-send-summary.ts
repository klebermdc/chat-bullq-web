/** Resultado por voucher que o backend devolve no `markOrderSent`. */
export interface VoucherSendResult {
  filename: string;
  sent: boolean;
  error?: string;
}

export interface SendSummary {
  kind: 'success' | 'error';
  message: string;
}

/**
 * Traduz o retorno do `markOrderSent` na mensagem que o atendente vê.
 *
 * A regra que importa: **um voucher que não chegou tem que doer**. Silêncio
 * aqui significa cliente sem o ingresso e ninguém sabendo.
 *
 * Por isso a conta nunca sai da lista vazia: `vouchers: []` e
 * `vouchers: undefined` produzem o MESMO `voucherResults: []` no backend —
 * vazio quer dizer "não tinha o que enviar", não "deu tudo certo". Quem sabe
 * se havia voucher é o `sentCount`, contado dos arquivos que de fato foram.
 */
export function summarizeOrderSent(params: {
  withAcceptance: boolean;
  /** Quantos vouchers foram efetivamente mandados no payload. */
  sentCount: number;
  results: VoucherSendResult[] | undefined;
}): SendSummary {
  const { withAcceptance, sentCount, results } = params;
  const failed = (results ?? []).filter((v) => !v.sent);

  if (failed.length > 0) {
    const names = failed.map((v) => v.filename).join(', ');
    return {
      kind: 'error',
      message:
        failed.length === 1
          ? `Aceite criado, mas o voucher "${names}" NÃO foi enviado ao cliente. Mande o arquivo pelo chat ou use "Reenviar link".`
          : `Aceite criado, mas ${failed.length} vouchers NÃO foram enviados ao cliente: ${names}. Mande os arquivos pelo chat ou use "Reenviar link".`,
    };
  }

  if (!withAcceptance) {
    return {
      kind: 'success',
      message: 'Pedido enviado — card movido pra etapa final. 🎫',
    };
  }

  // Só afirma que o voucher foi se houver arquivo enviado E confirmação do
  // backend para ele. Sem confirmação, fala apenas do que temos certeza.
  const confirmedVouchers = sentCount > 0 && (results?.length ?? 0) > 0;
  return {
    kind: 'success',
    message: confirmedVouchers
      ? 'Pedido enviado — voucher e link de aceite enviados ao cliente. 🎫'
      : 'Pedido enviado — link de aceite enviado ao cliente. 🎫',
  };
}
