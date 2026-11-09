/**
 * Fase do lead na lista de conversas (cor + rótulo da linha). Mesma regra do
 * filtro ?phase= na API (inbox-advanced-where.ts): mudou aqui, muda lá.
 *
 *  • sdr   — sem atendente, sem transferência pendente, sem esperar humano e
 *            com a IA não desligada na conversa: a Aline está no comando.
 *  • queue — sem atendente e com transferência da Aline PENDENTE (o botão
 *            "Distribuir"). O nome da etapa do card não basta: ele fica em
 *            "Distribuir" depois de rejeitar, expirar ou mover à mão.
 *  • start — com atendente, mas o card segue em "Distribuir" (não clicou em
 *            "Iniciar atendimento").
 */
export type LeadPhase = 'sdr' | 'queue' | 'start';

export interface LeadPhaseInput {
  status: string;
  assignedToId?: string | null;
  awaitingHumanReply?: boolean;
  aiEnabled?: boolean | null;
  cards?: readonly { stage?: { name?: string | null } | null }[] | null;
  /** Transferência da Aline esperando distribuição (a API manda no máx. 1). */
  aiPendingActions?: readonly { id: string }[] | null;
}

const DISTRIBUTE_STAGE = 'distribu';

function inDistributeStage(conv: LeadPhaseInput): boolean {
  return (
    conv.cards?.some((c) => c.stage?.name?.toLowerCase().includes(DISTRIBUTE_STAGE)) ?? false
  );
}

export function leadPhaseOf(conv: LeadPhaseInput): LeadPhase | null {
  if (conv.status === 'CLOSED') return null;
  const distribute = inDistributeStage(conv);
  if (conv.assignedToId) return distribute ? 'start' : null;
  if ((conv.aiPendingActions?.length ?? 0) > 0) return 'queue';
  const aiInCharge = !conv.awaitingHumanReply && conv.aiEnabled !== false;
  return aiInCharge ? 'sdr' : null;
}
