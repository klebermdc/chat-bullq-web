/**
 * Estado da fatia de histórico que o chat tem carregada.
 *
 * - `pinned`: o usuário saiu do "vivo" (rolou pra cima ou pulou pra uma
 *   mensagem antiga). Enquanto estiver preso, o refetch de foco/reconexão fica
 *   desligado — ele devolveria a lista às últimas 50 e jogaria fora o histórico
 *   que se foi buscar.
 * - `hasOlder`: ainda há mensagens atrás da primeira carregada.
 * - `isAtEnd`: a fatia carregada alcança a última mensagem da conversa.
 */
export type HistoryWindow = {
  pinned: boolean;
  hasOlder: boolean;
  isAtEnd: boolean;
};

/** Estado inicial: as últimas mensagens, coladas no fim da conversa. */
export const LIVE_WINDOW: HistoryWindow = {
  pinned: false,
  hasOlder: true,
  isAtEnd: true,
};

/**
 * Mensagem que chega pelo socket só pode entrar no fim da lista se a fatia
 * carregada for de fato o fim. Numa janela histórica, appendar colaria uma
 * mensagem de agora logo abaixo de uma de meses atrás.
 */
export function shouldAppendIncoming(window: HistoryWindow): boolean {
  return window.isAtEnd;
}

/** Depois de carregar as anteriores: a janela cresce pra trás e fica presa. */
export function windowAfterLoadOlder(
  window: HistoryWindow,
  hasOlder: boolean,
): HistoryWindow {
  return { ...window, pinned: true, hasOlder };
}

/**
 * Depois de pular pra uma mensagem. Se a janela caiu no fim da conversa e não
 * há mais nada atrás, não há o que preservar — volta a ser o vivo.
 */
export function windowAfterJump(bounds: {
  hasOlder: boolean;
  isAtEnd: boolean;
}): HistoryWindow {
  if (bounds.isAtEnd && !bounds.hasOlder) return LIVE_WINDOW;
  return { pinned: true, hasOlder: bounds.hasOlder, isAtEnd: bounds.isAtEnd };
}
