import type { ContractDelivery, ContractSendResult, ContractStatus } from '../types';

export type DeliveryFeedback =
  | { kind: 'success'; message: string }
  | { kind: 'warning'; message: string };

/**
 * Mensagem para o atendente depois de criar ou reenviar. Sem `send` (API
 * antiga) assume enfileirado, que era o comportamento de antes do campo.
 */
export function deliveryFeedback(send: ContractSendResult | null, action: 'create' | 'resend'): DeliveryFeedback {
  if (!send || send.queued) {
    return {
      kind: 'success',
      message: action === 'create' ? 'Contrato enviado ao cliente pelo WhatsApp.' : 'Link reenviado ao cliente.',
    };
  }
  const reason = send.error?.trim() || 'motivo não informado';
  const prefix = action === 'create' ? 'Contrato criado, mas o link não foi enviado' : 'O link não foi reenviado';
  return { kind: 'warning', message: `${prefix}: ${reason}` };
}

function readSend(raw: unknown): ContractSendResult | null {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;
  if (typeof record.queued !== 'boolean') return null;
  return {
    queued: record.queued,
    messageId: typeof record.messageId === 'string' ? record.messageId : undefined,
    error: typeof record.error === 'string' ? record.error : undefined,
  };
}

/** Separa status, link e envio da resposta de criação/reenvio. */
export function toContractDelivery(
  raw: ContractStatus & { link?: unknown; send?: unknown },
  normalize: (contract: ContractStatus) => ContractStatus,
): ContractDelivery {
  const { link, send, ...contract } = raw;
  return {
    contract: normalize(contract as ContractStatus),
    link: typeof link === 'string' && link.trim() ? link : null,
    send: readSend(send),
  };
}

/** Status em que ainda faz sentido mandar o link de novo. */
export function canResendContract(status: ContractStatus['status']): boolean {
  return status === 'PENDING' || status === 'EXPIRED';
}
