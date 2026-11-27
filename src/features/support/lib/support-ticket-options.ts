/** Mesmas chaves da API (support-tickets.constants). */
export const SUPPORT_CATEGORY_OPTIONS = [
  { value: 'outro', label: 'Atenção especial / outro' },
  { value: 'ingresso', label: 'Ingresso' },
  { value: 'pagamento', label: 'Pagamento' },
  { value: 'reembolso_troca', label: 'Reembolso/troca' },
  { value: 'transfer', label: 'Transfer' },
  { value: 'hotel', label: 'Hotel' },
  { value: 'voo', label: 'Voo' },
  { value: 'documento_imigracao', label: 'Documento' },
  { value: 'saude_seguranca', label: 'Saúde/segurança' },
] as const;

export const SUPPORT_PRIORITY_OPTIONS = [
  { value: 'normal', label: 'Normal' },
  { value: 'alta', label: 'Alta' },
  { value: 'urgente', label: 'Urgente (problema crítico)' },
] as const;

export type SupportCategory = (typeof SUPPORT_CATEGORY_OPTIONS)[number]['value'];
export type SupportPriority = (typeof SUPPORT_PRIORITY_OPTIONS)[number]['value'];

export const REASON_MIN = 5;
export const REASON_MAX = 500;

/** Motivo válido para enviar (a API exige 5–500 caracteres). */
export function isReasonValid(reason: string): boolean {
  const length = reason.trim().length;
  return length >= REASON_MIN && length <= REASON_MAX;
}
