import type { BadgeProps } from '@/components/ui/badge';

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})/;

/** "2026-09-06" ou "2026-09-06T12:00:00Z" → "06/09/2026". Sem fuso: usa o dia que veio escrito. */
export function formatOrderDate(value: unknown): string {
  if (typeof value !== 'string' || value === '') return '—';
  const match = ISO_DATE.exec(value);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
}

type StatusMeta = { label: string; variant: BadgeProps['variant'] };

// O status vem do HUB como texto livre. Os valores conhecidos em inglês ganham
// rótulo em português; o que não estiver aqui aparece como veio.
const STATUS_BY_KEY: Record<string, StatusMeta> = {
  paid: { label: 'Pago', variant: 'success' },
  pago: { label: 'Pago', variant: 'success' },
  approved: { label: 'Aprovado', variant: 'success' },
  aprovado: { label: 'Aprovado', variant: 'success' },
  completed: { label: 'Concluído', variant: 'success' },
  complete: { label: 'Concluído', variant: 'success' },
  concluido: { label: 'Concluído', variant: 'success' },
  confirmed: { label: 'Confirmado', variant: 'success' },
  confirmado: { label: 'Confirmado', variant: 'success' },
  delivered: { label: 'Entregue', variant: 'success' },
  entregue: { label: 'Entregue', variant: 'success' },
  pending: { label: 'Pendente', variant: 'hot' },
  pendente: { label: 'Pendente', variant: 'hot' },
  processing: { label: 'Em processamento', variant: 'info' },
  'on-hold': { label: 'Em espera', variant: 'hot' },
  on_hold: { label: 'Em espera', variant: 'hot' },
  open: { label: 'Aberto', variant: 'info' },
  aberto: { label: 'Aberto', variant: 'info' },
  draft: { label: 'Rascunho', variant: 'neutral' },
  cancelled: { label: 'Cancelado', variant: 'neutral' },
  canceled: { label: 'Cancelado', variant: 'neutral' },
  cancelado: { label: 'Cancelado', variant: 'neutral' },
  refunded: { label: 'Reembolsado', variant: 'neutral' },
  reembolsado: { label: 'Reembolsado', variant: 'neutral' },
  failed: { label: 'Falhou', variant: 'hot' },
  expired: { label: 'Expirado', variant: 'neutral' },
};

function normalize(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

export function orderStatusMeta(value: unknown): StatusMeta | null {
  if (typeof value !== 'string' || value.trim() === '') return null;
  return STATUS_BY_KEY[normalize(value)] ?? { label: value.trim(), variant: 'neutral' };
}
