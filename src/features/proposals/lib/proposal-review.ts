import type { ReviewedOtherProposal, ReviewedProposal } from '../types';

/** Espelham os limites da API (proposals.constants). */
export const REVIEW_TITLE_MAX = 120;
export const REVIEW_MAX_LINES = 12;
export const REVIEW_LINE_MAX = 160;

/** Uma condição por linha: apara e descarta linhas em branco. */
export function linesFromText(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

/** Proposta com o que o atendente corrigiu na conferência. Não altera a original. */
export function applyOtherEdits(
  proposal: ReviewedOtherProposal,
  edits: { title: string; linesText: string },
): ReviewedOtherProposal {
  return { ...proposal, title: edits.title.trim(), lines: linesFromText(edits.linesText) };
}

/**
 * O que impede o envio da proposta conferida, em texto para o atendente; null
 * quando está tudo certo. Ingressos (PARKS) não são editados na tela, então
 * não há o que validar aqui.
 */
export function reviewIssue(proposal: ReviewedProposal): string | null {
  if (proposal.kind !== 'OTHER') return null;
  if (!proposal.title.trim()) return 'Escreva o nome do produto.';
  if (proposal.title.length > REVIEW_TITLE_MAX) {
    return `O nome do produto pode ter até ${REVIEW_TITLE_MAX} caracteres.`;
  }
  if (proposal.lines.length === 0) return 'Escreva pelo menos uma condição.';
  if (proposal.lines.length > REVIEW_MAX_LINES) {
    return `A proposta pode ter até ${REVIEW_MAX_LINES} linhas de condições.`;
  }
  if (proposal.lines.some((line) => line.length > REVIEW_LINE_MAX)) {
    return `Cada linha pode ter até ${REVIEW_LINE_MAX} caracteres.`;
  }
  return null;
}
