import type {
  CategoryRow,
  ChannelCosts,
  PerConversation,
  SenderRow,
  TemplateRow,
} from '../services/whatsapp-costs.service';
import { formatAverage } from './format';
import { isChargedType, isMarketingCategory } from './labels';

/**
 * Canal que abre a tela: o de maior custo entre os que responderam. Sem
 * nenhum que respondeu, o primeiro da lista (para mostrar o erro dele).
 */
export function pickDefaultChannelId(channels: ReadonlyArray<ChannelCosts>): string | null {
  const healthy = channels.filter((channel) => channel.status === 'ok');
  const pool = healthy.length > 0 ? healthy : channels;
  const top = pool.reduce<ChannelCosts | null>(
    (best, channel) => (best === null || channel.totals.cost > best.totals.cost ? channel : best),
    null,
  );
  return top?.channelId ?? null;
}

/** Mantém a escolha da pessoa enquanto o canal existir; senão volta ao padrão. */
export function resolveChannelId(
  channels: ReadonlyArray<ChannelCosts>,
  chosenId: string | null,
): string | null {
  const isChosenPresent = chosenId !== null && channels.some((c) => c.channelId === chosenId);
  return isChosenPresent ? chosenId : pickDefaultChannelId(channels);
}

/** Houve alguma mensagem (cobrada ou grátis) no período. */
export function hasActivity(channel: ChannelCosts): boolean {
  return channel.totals.billable + channel.totals.free > 0;
}

/** Cobradas primeiro, da mais cara para a mais barata; depois as grátis, por volume. */
export function sortCategoryRows(rows: ReadonlyArray<CategoryRow>): CategoryRow[] {
  const charged = rows.filter((row) => isChargedType(row.type)).sort((a, b) => b.cost - a.cost);
  const free = rows.filter((row) => !isChargedType(row.type)).sort((a, b) => b.volume - a.volume);
  return [...charged, ...free];
}

/** Do maior custo para o menor; empate decide quem mandou mais mensagens cobradas. */
export function sortSenders(senders: ReadonlyArray<SenderRow>): SenderRow[] {
  const charged = (s: SenderRow) => s.service + s.marketing + s.utility;
  return [...senders].sort((a, b) => b.cost - a.cost || charged(b) - charged(a));
}

export function sortTemplates(templates: ReadonlyArray<TemplateRow>): TemplateRow[] {
  return [...templates].sort((a, b) => b.cost - a.cost || b.sent - a.sent);
}

export function hasMarketingTemplates(templates: ReadonlyArray<TemplateRow>): boolean {
  return templates.some((t) => isMarketingCategory(t.category) && t.sent > 0);
}

/** Quantas respostas (24h) custa um template de marketing, arredondado; null sem os dois preços. */
export function marketingToServiceRatio(unitPrices: Readonly<Record<string, number>>): number | null {
  const marketing = unitPrices.MARKETING;
  const service = unitPrices.SERVICE;
  if (!(marketing > 0) || !(service > 0)) return null;
  return Math.round(marketing / service);
}

/** Dica para recriar template de marketing como utilidade. */
export function marketingHint(ratio: number | null): string {
  const comparison =
    ratio !== null && ratio > 1 ? `custa ~${ratio}× uma resposta` : 'custa bem mais que uma resposta';
  return `Template de marketing ${comparison}; se o texto for aviso/serviço, dá para recriar como Utilidade.`;
}

/** "Uma conversa típica gera N mensagens cobradas (10% passam de M)." */
export function describePerConversation(perConversation: PerConversation | null): string | null {
  if (!perConversation || perConversation.conversations <= 0) return null;
  const { median, p90 } = perConversation;
  const noun = median === 1 ? 'mensagem cobrada' : 'mensagens cobradas';
  return `Uma conversa típica gera ${formatAverage(median)} ${noun} (10% passam de ${formatAverage(p90)}).`;
}
