type MergeableMessage = { id: string; externalId: string | null; createdAt: string };

function sameMessage(a: MergeableMessage, b: MergeableMessage): boolean {
  return a.id === b.id || (!!a.externalId && !!b.externalId && a.externalId === b.externalId);
}

function shallowEqual(a: object, b: object): boolean {
  const ka = Object.keys(a);
  const kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  return ka.every((k) => (a as any)[k] === (b as any)[k]);
}

/**
 * Junta a página mais recente do servidor no que o chat já tem carregado.
 *
 * É o backfill de quando o socket perde um `message:new` (aba em segundo
 * plano, notebook dormindo, token vencido na reconexão, deploy). Diferente de
 * um refetch, NÃO substitui a lista — o histórico que o usuário foi buscar
 * rolando pra cima continua lá. Mensagens novas entram em ordem cronológica;
 * as que já existem recebem a cópia do servidor (status atualizado).
 */
export function mergeLatestMessages<T extends MergeableMessage>(
  cached: T[],
  latest: T[],
): { messages: T[]; added: number } {
  let changed = false;
  const merged = [...cached];
  const fresh: T[] = [];

  for (const incoming of latest) {
    const idx = merged.findIndex((m) => sameMessage(m, incoming));
    if (idx === -1) {
      fresh.push(incoming);
      continue;
    }
    const updated = { ...merged[idx], ...incoming };
    if (!shallowEqual(updated, merged[idx])) {
      merged[idx] = updated;
      changed = true;
    }
  }

  if (fresh.length === 0) return { messages: changed ? merged : cached, added: 0 };

  const all = [...merged, ...fresh].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
  return { messages: all, added: fresh.length };
}
