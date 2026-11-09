export interface QuickReplyEditor {
  userId: string | null;
  /** Dono ou admin da organização. */
  isManager: boolean;
}

/**
 * Quem pode editar/excluir: dono/admin qualquer uma; atendente só a própria.
 * Espelha a regra da API (a API é quem garante; aqui só esconde o botão).
 */
export function canChangeReply(reply: { ownerUserId: string | null }, editor: QuickReplyEditor): boolean {
  if (editor.isManager) return true;
  return editor.userId !== null && reply.ownerUserId === editor.userId;
}
