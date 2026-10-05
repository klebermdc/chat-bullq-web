export interface RowTagInfo {
  id: string;
  name: string;
  color?: string | null;
  textColor?: string | null;
}

export interface RowTag {
  tag: RowTagInfo;
  /** Tag da ficha do contato (contorno tracejado na linha). */
  onContact: boolean;
}

interface RowTagsSource {
  assignedTo?: { id: string; name: string } | null;
  tags?: { tag: RowTagInfo }[];
  contact: { tags?: { tag: RowTagInfo }[] };
}

const normalize = (name: string) => name.trim().toLowerCase();

/**
 * Tags que aparecem na linha da lista do Inbox.
 *
 * Lead ainda sem atendente: tags da conversa e depois as do contato.
 * Lead distribuído: só a etiqueta do vendedor — a Tag com o NOME do atendente,
 * que o backend mantém na conversa e no contato (`syncAttendantTag`). As outras
 * continuam na ficha do cliente. Se a etiqueta ainda não existir, a linha
 * mostra o nome do atendente mesmo assim.
 */
export function rowTagsFor(conv: RowTagsSource): RowTag[] {
  const conversationTags = (conv.tags ?? []).map((t) => t.tag);
  const contactTags = (conv.contact.tags ?? []).map((t) => t.tag);

  if (!conv.assignedTo) {
    return [
      ...conversationTags.map((tag) => ({ tag, onContact: false })),
      ...contactTags.map((tag) => ({ tag, onContact: true })),
    ];
  }

  const attendantName = normalize(conv.assignedTo.name);
  if (!attendantName) return [];

  const attendantTag = [...conversationTags, ...contactTags].find(
    (tag) => normalize(tag.name) === attendantName,
  );
  return [
    {
      tag: attendantTag ?? {
        id: `attendant-${conv.assignedTo.id}`,
        name: conv.assignedTo.name.trim(),
        color: null,
      },
      onContact: false,
    },
  ];
}
