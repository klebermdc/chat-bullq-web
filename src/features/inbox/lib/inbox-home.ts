/**
 * Clique no logo do menu: volta o Inbox para a tela de abertura (sem conversa
 * aberta). Se o Inbox já está montado, a navegação para a mesma URL não
 * reseta o estado, então avisamos por evento.
 */
export const INBOX_HOME_EVENT = 'sendtur:inbox-home';

export function requestInboxHome(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(INBOX_HOME_EVENT));
}
