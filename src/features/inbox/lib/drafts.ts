// Rascunho do compositor por conversa. O ChatPanel é recriado a cada troca de
// conversa, e o texto pela metade sumia quando o operador ia conferir outra
// conversa ou abria uma notificação. Fica em memória e no sessionStorage
// (sobrevive a F5, some ao fechar a aba).

const STORAGE_PREFIX = 'inbox-draft:';
const memory = new Map<string, string>();

function storage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

export function loadDraft(conversationId: string | undefined): string {
  if (!conversationId) return '';
  const cached = memory.get(conversationId);
  if (cached !== undefined) return cached;
  try {
    return storage()?.getItem(STORAGE_PREFIX + conversationId) ?? '';
  } catch {
    return '';
  }
}

export function saveDraft(conversationId: string | undefined, text: string): void {
  if (!conversationId) return;
  const key = STORAGE_PREFIX + conversationId;
  try {
    if (text.trim()) {
      memory.set(conversationId, text);
      storage()?.setItem(key, text);
    } else {
      memory.delete(conversationId);
      storage()?.removeItem(key);
    }
  } catch {
    // Storage cheio ou bloqueado: o rascunho em memória basta.
  }
}

export function clearAllDraftsForTest(): void {
  memory.clear();
}
