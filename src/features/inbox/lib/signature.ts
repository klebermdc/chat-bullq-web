// Assinatura do vendedor: o backend põe "*Nome:*" na linha de cima de toda
// mensagem de texto digitada no chat. ADM e Proprietário podem desligar; a
// escolha fica neste navegador (por usuário) até religarem.

const STORAGE_PREFIX = 'inbox-unsigned:';
const UNSIGNED_ROLES = new Set(['OWNER', 'ADMIN']);

export function canSendUnsigned(role: string | null | undefined): boolean {
  return !!role && UNSIGNED_ROLES.has(role);
}

export function loadUnsigned(userId: string | undefined): boolean {
  if (!userId) return false;
  try {
    return window.localStorage.getItem(STORAGE_PREFIX + userId) === '1';
  } catch {
    return false;
  }
}

export function saveUnsigned(userId: string | undefined, unsigned: boolean): void {
  if (!userId) return;
  try {
    if (unsigned) window.localStorage.setItem(STORAGE_PREFIX + userId, '1');
    else window.localStorage.removeItem(STORAGE_PREFIX + userId);
  } catch {
    // Storage bloqueado: a escolha vale só enquanto a tela estiver aberta.
  }
}
