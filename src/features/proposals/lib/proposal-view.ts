import type { ProposalDetails, ProposalKind } from '../types';

/**
 * Como mostrar uma proposta já enviada — a mesma decisão vale para a gaveta do
 * cliente ("Última proposta") e para o cartão do funil.
 *
 * - PARKS (ou proposta antiga, sem `kind`): pessoas, datas e parques.
 * - OTHER (carro, seguro…): `details.title` + `details.lines`; pessoas, datas
 *   e parques vêm zerados e não devem aparecer.
 * - Valor 0 = não informado: some, em vez de virar "R$ 0".
 */

/** Só os campos que a decisão usa — as duas telas têm tipos próprios de proposta. */
export interface ProposalLike {
  kind?: ProposalKind | null;
  details?: ProposalDetails | null;
  totalValue?: string | number | null;
  checkoutUrl?: string | null;
}

export interface ProposalView {
  kind: ProposalKind;
  /** false = esconder o valor (0 ou ausente). */
  hasValue: boolean;
  /** Só em OTHER. */
  title: string | null;
  /** Só em OTHER; sem linhas em branco. */
  lines: string[];
  /** null = proposta sem carrinho para abrir. */
  checkoutUrl: string | null;
  /** "2 prints enviados", ou null quando não foi print nenhum. */
  printsNote: string | null;
}

const OTHER_FALLBACK_TITLE = 'Outros produtos';

function cleanLines(lines: unknown): string[] {
  if (!Array.isArray(lines)) return [];
  return lines
    .filter((line): line is string => typeof line === 'string')
    .map((line) => line.trim())
    .filter(Boolean);
}

function printsNote(images: unknown): string | null {
  const count = Array.isArray(images) ? images.length : 0;
  if (count === 0) return null;
  return count === 1 ? '1 print enviado' : `${count} prints enviados`;
}

function hasPositiveValue(value: ProposalLike['totalValue']): boolean {
  if (value === null || value === undefined || value === '') return false;
  const n = Number(value);
  return Number.isFinite(n) && n > 0;
}

export function presentProposal(proposal: ProposalLike): ProposalView {
  const details = proposal.details ?? null;
  const isOther = proposal.kind === 'OTHER';
  return {
    kind: isOther ? 'OTHER' : 'PARKS',
    hasValue: hasPositiveValue(proposal.totalValue),
    title: isOther ? details?.title?.trim() || OTHER_FALLBACK_TITLE : null,
    lines: isOther ? cleanLines(details?.lines) : [],
    checkoutUrl: proposal.checkoutUrl?.trim() || null,
    printsNote: printsNote(details?.images),
  };
}
