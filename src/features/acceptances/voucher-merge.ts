import type { AcceptanceItem } from './types';

/**
 * Chave de identidade de um item: descrição normalizada + data. Normalizar
 * caixa, acento e espaço evita duplicar "Ingresso Único" e "ingresso unico",
 * que é como a Ficha do Pedido e o voucher costumam divergir.
 */
function itemKey(item: AcceptanceItem): string {
  const desc = item.description
    .normalize('NFD')
    // Remove as marcas de acento que o NFD separou. Mantenha o escape
    // \u0300-\u036f: escrever o intervalo com os caracteres literais funciona,
    // mas eles são invisíveis no editor e somem no primeiro "limpa arquivo".
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
  return `${desc}|${(item.date ?? '').trim()}`;
}

/**
 * Mescla os itens lidos do voucher no rascunho vindo da Ficha do Pedido.
 *
 * Em empate, **vence o item do voucher**: a Ficha registra o que o cliente
 * pediu; o voucher é o que foi entregue — e é a entrega que ele assina.
 * Sempre devolve arrays novos (nada de mutar a entrada).
 */
export function mergeVoucherItems(
  draft: AcceptanceItem[],
  fromVoucher: AcceptanceItem[],
): AcceptanceItem[] {
  if (fromVoucher.length === 0) return [...draft];

  const byKey = new Map<string, AcceptanceItem>();
  for (const item of fromVoucher) byKey.set(itemKey(item), item);

  const merged = draft.map((item) => byKey.get(itemKey(item)) ?? item);
  const usedKeys = new Set(draft.map(itemKey));
  const novos = fromVoucher.filter((item) => !usedKeys.has(itemKey(item)));

  return [...merged, ...novos];
}

/**
 * Escolhe o nº do pedido entre os vouchers anexados. Vale o primeiro
 * não-vazio; divergência vira `conflict` — quase sempre significa voucher de
 * outro cliente anexado por engano, e é melhor perguntar que adivinhar.
 */
export function pickOrderRef(refs: Array<string | null>): {
  orderRef: string | null;
  conflict: boolean;
} {
  const found = refs.filter((r): r is string => !!r && !!r.trim()).map((r) => r.trim());
  if (found.length === 0) return { orderRef: null, conflict: false };
  return {
    orderRef: found[0],
    conflict: new Set(found).size > 1,
  };
}
