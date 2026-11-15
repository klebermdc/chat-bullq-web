import type { AcceptanceStatus } from './types';

export const ACCEPTANCE_STATUS_LABEL: Record<AcceptanceStatus, string> = {
  PENDING: 'Pendente',
  SIGNED: 'Assinado',
  EXPIRED: 'Expirado',
  CANCELED: 'Cancelado',
};

/** Cor do selo de status, alinhada às demais badges do drawer. */
export function acceptanceStatusClasses(status: AcceptanceStatus): string {
  switch (status) {
    case 'SIGNED':
      return 'bg-success-wash text-success-ink';
    case 'EXPIRED':
    case 'CANCELED':
      return 'bg-muted text-muted-foreground';
    case 'PENDING':
    default:
      return 'bg-warning-wash text-warning-ink';
  }
}
