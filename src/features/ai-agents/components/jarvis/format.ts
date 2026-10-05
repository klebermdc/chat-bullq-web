export const fmtUsd = (n: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  }).format(n);

export const fmtUsdShort = (n: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);

export const fmtNum = (n: number) =>
  new Intl.NumberFormat('pt-BR').format(n);

export const fmtMs = (ms: number | null) => {
  if (ms == null) return '—';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
};

export const fmtRelative = (iso: string) => {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return `${Math.floor(ms / 1000)}s atrás`;
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}min atrás`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h atrás`;
  return `${Math.floor(ms / 86_400_000)}d atrás`;
};

export const FINAL_ACTION_META: Record<
  string,
  { label: string; color: string }
> = {
  REPLIED: { label: 'Respondeu', color: 'bg-success-wash text-success-ink' },
  DELEGATED: { label: 'Delegou', color: 'bg-primary/10 text-primary' },
  HANDED_BACK: { label: 'Devolveu', color: 'bg-muted text-foreground' },
  TRANSFERRED_TO_HUMAN: { label: 'Para humano', color: 'bg-warning-wash text-warning-ink' },
  CLOSED_CONVERSATION: { label: 'Encerrou', color: 'bg-muted text-foreground' },
  NO_ACTION: { label: 'Sem ação', color: 'bg-muted text-muted-foreground' },
  NONE: { label: 'Sem ação', color: 'bg-muted text-muted-foreground' },
};

const UNKNOWN_FINAL_ACTION = { label: 'Sem ação', color: 'bg-muted text-muted-foreground' };

/** Nunca devolve undefined: ação que o front ainda não conhece vira texto legível. */
export function finalActionMeta(action: string | null | undefined): { label: string; color: string } {
  if (!action) return UNKNOWN_FINAL_ACTION;
  return (
    FINAL_ACTION_META[action] ?? {
      label: humanizeEnum(action),
      color: UNKNOWN_FINAL_ACTION.color,
    }
  );
}

/** "TRANSFERRED_TO_HUMAN" → "Transferred to human" (último recurso para enum sem rótulo). */
export function humanizeEnum(value: string): string {
  const text = value.replace(/[_-]+/g, ' ').trim().toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Resultado de uma execução: palavra + par de lavagem/tinta de estado
 * (sucesso / urgente / atenção). Nunca só a cor.
 */
export const STATUS_META: Record<string, { label: string; color: string }> = {
  COMPLETED: { label: 'Concluída', color: 'bg-success-wash text-success-ink' },
  RUNNING: { label: 'Em andamento', color: 'bg-warning-wash text-warning-ink' },
  FAILED: { label: 'Falhou', color: 'bg-urgent-wash text-urgent-ink' },
  SKIPPED: { label: 'Ignorada', color: 'bg-muted text-muted-foreground' },
};

const UNKNOWN_STATUS = { label: 'Desconhecido', color: 'bg-muted text-muted-foreground' };

export function runStatusMeta(status: string | null | undefined): { label: string; color: string } {
  if (!status) return UNKNOWN_STATUS;
  return STATUS_META[status] ?? { label: humanizeEnum(status), color: UNKNOWN_STATUS.color };
}

/** Status da conversa (enum do banco) como aparece no inbox. */
const CONVERSATION_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendente',
  BOT: 'No bot',
  OPEN: 'Aberta',
  WAITING: 'Aguardando',
  CLOSED: 'Fechada',
};

export function conversationStatusLabel(status: string): string {
  return CONVERSATION_STATUS_LABELS[status] ?? humanizeEnum(status);
}
