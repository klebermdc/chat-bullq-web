import type { AcceptanceItem } from './types';

/**
 * Descrição normalizada para comparação: sem acento, em minúscula e com o
 * espaço colapsado. Evita tratar "Ingresso Único" e "ingresso unico" como
 * itens diferentes, que é como a Ficha do Pedido e o voucher costumam divergir.
 */
function normalizeDescription(description: string): string {
  return description
    .normalize('NFD')
    // Remove as marcas de acento que o NFD separou. Mantenha o escape
    // \u0300-\u036f: escrever o intervalo com os caracteres literais funciona,
    // mas eles são invisíveis no editor e somem no primeiro "limpa arquivo".
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** Data do item, ou `undefined` quando aquele lado não informou nenhuma. */
function itemDate(item: AcceptanceItem): string | undefined {
  return item.date?.trim() || undefined;
}

/**
 * Dois itens são o mesmo quando a descrição normalizada bate e as datas não
 * se contradizem.
 *
 * A data só separa dois itens quando os DOIS lados têm uma para comparar: a
 * Ficha do Pedido costuma vir sem data e o voucher sempre traz a sua, então
 * exigir data dos dois lados duplicaria a linha justamente no caso comum.
 */
function isSameItem(a: AcceptanceItem, b: AcceptanceItem): boolean {
  if (normalizeDescription(a.description) !== normalizeDescription(b.description)) return false;

  const dateA = itemDate(a);
  const dateB = itemDate(b);
  return dateA === undefined || dateB === undefined || dateA === dateB;
}

/**
 * Mescla os itens lidos do voucher no rascunho vindo da Ficha do Pedido.
 *
 * Em empate, **vence o item do voucher**: a Ficha registra o que o cliente
 * pediu; o voucher é o que foi entregue — e é a entrega que ele assina.
 *
 * Nenhum item do voucher some. Cada um é consumido no máximo uma vez, então
 * dois ingressos do mesmo dia com localizadores diferentes sobrevivem os dois
 * — perder um localizador num documento que o cliente assina é exatamente o
 * erro que este aceite existe para evitar. O que não casou com o rascunho vai
 * para o fim, na ordem original.
 *
 * Sempre devolve arrays novos E cópias dos itens: o retorno vai para um form
 * editável, e um item devolvido por referência faria a edição do atendente
 * escrever de volta no resultado da extração — bug silencioso e chato de achar.
 */
export function mergeVoucherItems(
  draft: AcceptanceItem[],
  fromVoucher: AcceptanceItem[],
): AcceptanceItem[] {
  const consumed = new Set<number>();
  const merged: AcceptanceItem[] = [];

  for (const item of draft) {
    const match = fromVoucher.findIndex((v, i) => !consumed.has(i) && isSameItem(item, v));
    if (match === -1) {
      merged.push({ ...item });
      continue;
    }
    consumed.add(match);
    merged.push({ ...fromVoucher[match] });
  }

  const novos = fromVoucher
    .filter((_, i) => !consumed.has(i))
    .map((item) => ({ ...item }));

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
