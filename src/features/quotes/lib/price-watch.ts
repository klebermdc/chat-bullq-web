import type { CompetitorComparison, CompetitorItemResult, CompetitorPlatform } from '../types';

export const PLATFORM_LABEL: Record<CompetitorPlatform, string> = {
  JUST_TRAVEL: 'Just Travel',
  SUNCOAST: 'SunCoast',
  OTHER: 'Outras',
};

/** Quantas lojas o gráfico de posição mostra (as mais baratas, além da OFP). */
export const RANKING_MAX_STORES = 12;

export interface RankingRow {
  name: string;
  total: number;
  isOurs: boolean;
}

/**
 * Barras do gráfico "posição da OFP": lojas com preço exato, da mais barata à
 * mais cara, com a OFP no lugar dela. "A partir de" fica fora (não é o mesmo produto).
 */
export function rankingRows(
  item: CompetitorItemResult,
  result: CompetitorComparison,
  maxStores = RANKING_MAX_STORES,
): RankingRow[] {
  const names = new Map(result.stores.map((s) => [s.id, s.name]));
  const stores = item.offers
    .filter((o) => o.status === 'OK' && o.total !== null && !o.isEstimate)
    .map((o) => ({ name: names.get(o.storeId) ?? o.storeId, total: o.total as number, isOurs: false }))
    .sort((a, b) => a.total - b.total)
    .slice(0, maxStores);
  return [...stores, { name: 'OFP', total: item.ourTotal, isOurs: true }].sort((a, b) => a.total - b.total);
}
