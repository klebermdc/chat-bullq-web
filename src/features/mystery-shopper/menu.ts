/** Acrescenta o item do cliente oculto só para quem tem acesso (sem mutar a lista). */
export function withMysteryShopperItem<T>(items: T[], allowed: boolean, item: T): T[] {
  return allowed ? [...items, item] : items;
}
