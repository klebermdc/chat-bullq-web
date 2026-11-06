/** Distância do fim, em pixels, dentro da qual o chat ainda "acompanha". */
export const NEAR_BOTTOM_PX = 120;

type ScrollBox = Pick<HTMLElement, 'scrollHeight' | 'scrollTop' | 'clientHeight'>;

/** O usuário está (quase) no fim da conversa — a última mensagem está à vista. */
export function isNearBottom(box: ScrollBox): boolean {
  return box.scrollHeight - box.scrollTop - box.clientHeight < NEAR_BOTTOM_PX;
}
