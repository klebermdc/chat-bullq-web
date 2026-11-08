export interface SellerTag {
  id: string;
  name: string;
  color: string | null;
  textColor: string | null;
}

interface Person {
  id: string;
  name: string;
}

interface SellerTagSource {
  assignedTo?: Person | null;
  conversation?: {
    assignedTo?: Person | null;
    tags?: { tag: { id: string; name: string; color?: string | null; textColor?: string | null } }[];
  } | null;
}

const normalize = (name: string) => name.trim().toLowerCase();

/**
 * Etiqueta do vendedor dono do lead, para o card do funil.
 *
 * O dono real é o atendente da conversa; `card.assignedTo` (atribuição no
 * pipeline) costuma ficar vazio e só vale quando não há conversa atribuída.
 * Usa a Tag com o nome do atendente (a mesma cor do Inbox, `syncAttendantTag`
 * no backend); se ela ainda não existir, mostra só o nome.
 */
export function sellerTagFor(card: SellerTagSource): SellerTag | null {
  const owner = card.conversation?.assignedTo ?? card.assignedTo ?? null;
  const ownerName = owner ? normalize(owner.name) : '';
  if (!owner || !ownerName) return null;

  const match = (card.conversation?.tags ?? [])
    .map((t) => t.tag)
    .find((tag) => normalize(tag.name) === ownerName);
  if (match) {
    return { id: match.id, name: match.name, color: match.color ?? null, textColor: match.textColor ?? null };
  }
  return { id: `attendant-${owner.id}`, name: owner.name.trim(), color: null, textColor: null };
}
