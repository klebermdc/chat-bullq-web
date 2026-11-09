import type { Member } from '@/features/settings/services/members.service';

/**
 * Vendedores que ainda podem ser incluídos na conversa: ativos, que não são o
 * dono nem já estão nela, filtrados pela busca (nome ou e-mail).
 */
export function participantCandidates(
  members: Member[],
  participantIds: string[],
  ownerId: string | null,
  search: string,
): Member[] {
  const inside = new Set(participantIds);
  const q = search.trim().toLowerCase();
  return members.filter(
    (m) =>
      m.user.isActive &&
      m.user.id !== ownerId &&
      !inside.has(m.user.id) &&
      (!q ||
        m.user.name.toLowerCase().includes(q) ||
        m.user.email.toLowerCase().includes(q)),
  );
}

/** Mesma regra da API: a própria pessoa (sair), o dono ou a gestão. */
export function canRemoveParticipant(params: {
  targetId: string;
  currentUserId: string | undefined;
  ownerId: string | null;
  isManager: boolean;
}): boolean {
  const { targetId, currentUserId, ownerId, isManager } = params;
  if (!currentUserId) return false;
  return targetId === currentUserId || ownerId === currentUserId || isManager;
}
