import type { ContractSendResult } from '../types';
import type { DeliveryFeedback } from './contract-delivery';

/**
 * Mensagem depois de enviar o pedido de dados na conversa. Sem `send` (API
 * não informou) assume enfileirado, como no envio do contrato.
 */
export function dataRequestFeedback(send: ContractSendResult | null): DeliveryFeedback {
  if (!send || send.queued) return { kind: 'success', message: 'Pedido de dados enviado ao cliente.' };
  const reason = send.error?.trim() || 'motivo não informado';
  return { kind: 'warning', message: `O pedido não foi enviado: ${reason}. Copie o texto e mande pelo WhatsApp.` };
}
