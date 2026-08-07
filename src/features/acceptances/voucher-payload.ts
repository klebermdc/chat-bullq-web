/** O mínimo que a regra de payload precisa saber sobre um anexo. */
export interface VoucherFileLike {
  url?: string;
  filename: string;
  size: number;
}

export interface VoucherPayloadEntry {
  url: string;
  filename: string;
  size: number;
}

/**
 * Decide o que vai no payload do `markOrderSent`.
 *
 * **Ter URL é o que decide — não o status.** Um PDF cuja leitura pela IA
 * falhou por transporte (token expirado, 404, conexão caída num restart da
 * API) já está no storage e precisa chegar ao cliente do mesmo jeito: a
 * leitura é um bônus, nunca um bloqueio.
 *
 * Filtrar por `status === 'done'` aqui descartava em silêncio um voucher
 * pronto para envio, e o atendente ainda lia "a caminho do cliente" — cliente
 * com link de assinatura para um voucher que nunca recebeu. É o desfecho que
 * esta feature inteira existe para evitar.
 */
export function voucherPayload(
  files: VoucherFileLike[],
): VoucherPayloadEntry[] {
  return files
    .filter((f) => !!f.url)
    .map((f) => ({
      url: f.url as string,
      filename: f.filename,
      size: f.size,
    }));
}

/**
 * Arquivos que nem chegaram ao storage. Sem URL não há o que enviar — mas o
 * atendente tem que saber, senão o resumo de sucesso contradiz o chip vermelho
 * que ainda está na tela.
 */
export function countFailedUploads(files: VoucherFileLike[]): number {
  return files.filter((f) => !f.url).length;
}
