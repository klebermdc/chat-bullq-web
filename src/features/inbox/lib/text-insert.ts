export interface CursorInsertResult {
  /** Texto já com o trecho inserido. */
  text: string;
  /** Onde o cursor deve ficar depois da inserção. */
  caret: number;
}

/**
 * Insere `insert` em `text` na posição do cursor, substituindo o que estiver
 * selecionado.
 *
 * `selectionStart`/`selectionEnd` vêm direto do textarea e não são confiáveis:
 * podem vir invertidos (seleção feita da direita para a esquerda) ou fora do
 * intervalo do texto. Por isso são normalizados antes do slice — sem isso o
 * `slice` devolve string vazia silenciosamente e o texto do atendente some.
 */
export function insertAtCursor(
  text: string,
  selectionStart: number,
  selectionEnd: number,
  insert: string,
): CursorInsertResult {
  const clamp = (n: number) => Math.max(0, Math.min(n, text.length));
  const a = clamp(selectionStart);
  const b = clamp(selectionEnd);
  const start = Math.min(a, b);
  const end = Math.max(a, b);

  return {
    text: text.slice(0, start) + insert + text.slice(end),
    caret: start + insert.length,
  };
}
