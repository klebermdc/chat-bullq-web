/**
 * Tooltip humano pra cada status de mensagem.
 *
 * A API compõe o `failedReason` como `[code] title: message` (ver
 * `formatMetaError` no message-mapper), então o código numérico da Meta chega
 * inteiro até aqui. Casamos por CÓDIGO, não pelo texto em inglês — a Meta
 * reescreve as mensagens sem avisar, e o operador não deveria ler nenhuma
 * delas.
 */

/**
 * Códigos que valem uma explicação em português com a ação correspondente.
 * Só entram códigos documentados pela Meta e que o operador consegue agir em
 * cima; o resto degrada pro texto cru, que é melhor que sumir.
 */
const META_ERROR_HINTS: Readonly<Record<string, string>> = {
  '131047':
    'cliente sem mensagem há mais de 24h. Use um template aprovado pra reabrir a conversa.',
  '131049':
    'a Meta segurou a entrega por limite de marketing por cliente. Reenviar não adianta — o template precisa ser recategorizado como UTILITY.',
  '131050':
    'o cliente optou por não receber mensagens de marketing da empresa. Não insista, não vai chegar.',
  '132000':
    'as variáveis enviadas não batem com as do template. É erro de configuração — avise o time técnico.',
};

/** Extrai o `131049` de `[131049] Message Undeliverable: ...`. */
function metaErrorCode(reason: string): string | undefined {
  return /^\[(\d+)\]/.exec(reason)?.[1];
}

function failureTooltip(failedReason?: string | null): string {
  if (!failedReason) return 'Falhou ao enviar';

  const code = metaErrorCode(failedReason);
  const hint = code ? META_ERROR_HINTS[code] : undefined;
  if (hint) return `Falhou: ${hint}`;

  // Mensagens anteriores à API #154 não têm o `[code]` no motivo. A janela de
  // 24h era detectada pelo texto e continua sendo, pro histórico não regredir.
  if (/re-?engagement/i.test(failedReason)) {
    return `Falhou: ${META_ERROR_HINTS['131047']}`;
  }

  return `Falhou: ${failedReason}`;
}

export function statusTooltip(
  status: string,
  failedReason?: string | null,
): string {
  switch (status) {
    case 'QUEUED':
      return 'Enviando…';
    case 'SENT':
      return 'Enviado pro provedor';
    case 'DELIVERED':
      return 'Entregue ao destinatário';
    case 'READ':
      return 'Lida';
    case 'FAILED':
      return failureTooltip(failedReason);
    default:
      return status;
  }
}
