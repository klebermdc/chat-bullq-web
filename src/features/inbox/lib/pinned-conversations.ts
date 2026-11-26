/** Teto de conversas fixadas por atendente (a API corta no mesmo número). */
export const PINNED_LIMIT = 5;

/** Lê a preferência salva com segurança: só strings, sem repetidos, até o teto. */
export function sanitizePinnedIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const ids = raw.filter((v): v is string => typeof v === 'string' && v.length > 0);
  return [...new Set(ids)].slice(0, PINNED_LIMIT);
}

export type TogglePinnedResult =
  | { ok: true; ids: string[]; pinned: boolean }
  | { ok: false; reason: 'limit' };

/** Fixa (no topo da lista) ou desafixa. Recusa passar do teto em vez de soltar outra. */
export function togglePinned(ids: readonly string[], id: string): TogglePinnedResult {
  if (ids.includes(id)) {
    return { ok: true, ids: ids.filter((x) => x !== id), pinned: false };
  }
  if (ids.length >= PINNED_LIMIT) return { ok: false, reason: 'limit' };
  return { ok: true, ids: [id, ...ids], pinned: true };
}
