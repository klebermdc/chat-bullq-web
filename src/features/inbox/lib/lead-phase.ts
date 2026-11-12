/**
 * Fase do lead na lista de conversas (cor + rótulo da linha). Mesma regra do
 * filtro ?phase= na API (inbox-advanced-where.ts): mudou aqui, muda lá.
 *
 *  • sdr   — sem atendente, sem transferência pendente, IA não desligada na
 *            conversa e canal atendido pela Aline (agente autônomo, IA do canal
 *            ligada). Não olha awaitingHumanReply: toda msg do cliente liga o
 *            flag e a resposta da IA não desliga (12/11/2026).
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
  /** A API manda aiEnabled + aiAgentChannels do canal na lista. */
  channel?: {
    aiEnabled?: boolean | null;
    aiAgentChannels?: readonly { id: string }[] | null;
  } | null;
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
  if (conv.aiEnabled === false) return null;
  const aline = channelHasAline(conv);
  // API sem os dados do canal (deploy fora de ordem): regra antiga.
  if (aline === undefined) return conv.awaitingHumanReply ? null : 'sdr';
  return aline ? 'sdr' : null;
}

/** O canal tem a Aline? undefined quando a API não mandou o vínculo. */
function channelHasAline(conv: LeadPhaseInput): boolean | undefined {
  const links = conv.channel?.aiAgentChannels;
  if (!links) return undefined;
  return links.length > 0 && conv.channel?.aiEnabled !== false;
}
