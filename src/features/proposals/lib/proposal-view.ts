import type { ProposalDetails, ProposalKind } from '../types';

/**
 * Como mostrar uma proposta já enviada — a mesma decisão vale para a gaveta do
 * cliente ("Última proposta") e para o cartão do funil.
 *
 * - PARKS (ou proposta antiga, sem `kind`): pessoas, datas e parques.
 * - OTHER (carro, seguro…): `details.title` + `details.lines`; pessoas, datas
 *   e parques vêm zerados e não devem aparecer.
 * - QUOTE (cotação por link): mostrada como OTHER — título fixo e uma linha
 *   por item. Os prints foram só lidos, não enviados: sem "prints enviados".
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
  /** QUOTE é apresentada como OTHER: as telas só conhecem os dois desenhos. */
  kind: Exclude<ProposalKind, 'QUOTE'>;
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
const QUOTE_TITLE = 'Cotação por link';

/** "Fornecedor · Produto" por item; dado externo, então tudo é conferido. */
function quoteLines(details: ProposalDetails | null): string[] {
  const items: unknown = details?.quote?.items;
  if (!Array.isArray(items)) return [];
  return items.flatMap((item) => {
    const provider = typeof item?.provider === 'string' ? item.provider.trim() : '';
    const title = typeof item?.title === 'string' ? item.title.trim() : '';
    const line = [provider, title].filter(Boolean).join(' · ');
    return line ? [line] : [];
  });
}

function presentQuoteProposal(proposal: ProposalLike): ProposalView {
  return {
    kind: 'OTHER',
    hasValue: hasPositiveValue(proposal.totalValue),
    title: QUOTE_TITLE,
    lines: quoteLines(proposal.details ?? null),
    checkoutUrl: null,
    printsNote: null,
  };
}

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
  if (proposal.kind === 'QUOTE') return presentQuoteProposal(proposal);
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
