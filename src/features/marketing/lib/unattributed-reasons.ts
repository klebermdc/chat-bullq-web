import type {
  MarketingUnattributedReason,
  MarketingUnattributedReasonRow,
} from "../services/marketing.service";

export const REASON_LABEL: Record<MarketingUnattributedReason, string> = {
  portfolio: "Carteira / recompra",
  ad_without_id: "Anúncio sem identificação",
  organic: "Instagram orgânico",
  site: "Site sem anúncio",
  hub: "Lançado pelo Hub",
  unknown: "Sem origem",
};

export const REASON_HINT: Record<MarketingUnattributedReason, string> = {
  portfolio: "Cliente da carteira antiga voltando: não veio de anúncio.",
  ad_without_id:
    "Veio pela frase do anúncio, mas a Meta não informou qual anúncio.",
  organic: "Link da bio ou conteúdo orgânico do Instagram.",
  site: "Formulário do site sem parâmetro de anúncio no link.",
  hub: "Pedido lançado no OFP Hub sem conversa no Sendtur (Azul, Just Travel, WhatsApp do vendedor). A compra vai para a Meta pelo Hub.",
  unknown: "Nenhum sinal de origem registrado.",
};

/** Motivos com venda, da maior receita para a menor. API antiga (sem `byReason`) → nenhum. */
export function visibleReasonRows(
  rows?: MarketingUnattributedReasonRow[],
): MarketingUnattributedReasonRow[] {
  return (rows ?? [])
    .filter((r) => r.deals > 0)
    .sort((a, b) => b.revenue - a.revenue);
}
