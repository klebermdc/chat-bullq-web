import { toast } from 'sonner';
import type { ContractDelivery } from '../types';
import { deliveryFeedback } from './contract-delivery';
import { copyContractLink } from './copy-link';

/** Aviso pós criação/reenvio; se o link não saiu, oferece copiá-lo. */
const WARNING_DURATION_MS = 15_000;

export function showDeliveryToast(delivery: ContractDelivery, action: 'create' | 'resend'): void {
  const feedback = deliveryFeedback(delivery.send, action);
  if (feedback.kind === 'success') {
    toast.success(feedback.message);
    return;
  }
  const link = delivery.link;
  toast.warning(feedback.message, {
    duration: WARNING_DURATION_MS,
    action: link ? { label: 'Copiar link', onClick: () => void copyContractLink(link) } : undefined,
  });
}
