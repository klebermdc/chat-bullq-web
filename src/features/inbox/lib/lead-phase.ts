/**
 * Fase do lead na lista de conversas (cor + rótulo da linha). Mesma regra do
 * filtro ?phase= na API (inbox-advanced-where.ts): mudou aqui, muda lá.
 *
 *  • sdr   — sem atendente, fora de "Distribuir", sem esperar humano e com a
 *            IA não desligada na conversa: a Aline está no comando.
 *  • queue — sem atendente e na etapa "Distribuir": esperando distribuição.
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
  if (distribute) return 'queue';
  const aiInCharge = !conv.awaitingHumanReply && conv.aiEnabled !== false;
  return aiInCharge ? 'sdr' : null;
}
