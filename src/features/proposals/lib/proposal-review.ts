/** Espelha o limite da API (PROPOSAL_TEXT_MAX): o texto vai numa mensagem só. */
export const REVIEW_TEXT_MAX = 4096;

/**
 * O que impede o envio do texto conferido, em texto para o atendente; null
 * quando está tudo certo.
 */
export function reviewTextIssue(text: string): string | null {
  if (!text.trim()) return 'Escreva a mensagem da proposta.';
  if (text.length > REVIEW_TEXT_MAX) {
    return `A mensagem da proposta pode ter até ${REVIEW_TEXT_MAX} caracteres.`;
  }
  return null;
}
