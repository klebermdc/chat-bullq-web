/**
 * Motivos de venda perdida. Mesma lista da API
 * (src/modules/pipelines/lost-sale.constants.ts) — ao mudar aqui, mude lá.
 */
export const LOST_REASONS = [
  { code: 'NO_REPLY', label: 'Não respondeu', hint: 'Sumiu depois do contato.' },
  { code: 'JUST_BROWSING', label: 'Curioso / só pesquisando', hint: 'Sem intenção de compra agora.' },
  { code: 'COMPETITOR', label: 'Comprou com concorrente', hint: 'Qual concorrente e por quanto?' },
  { code: 'PRICE', label: 'Preço / fora do orçamento', hint: 'Achou caro ou não cabia no orçamento.' },
  { code: 'TRIP_CANCELLED', label: 'Desistiu da viagem', hint: 'Cancelou ou adiou a viagem.' },
  { code: 'OTHER', label: 'Outro', hint: 'Escreva o motivo.' },
] as const;

export type LostReasonCode = (typeof LOST_REASONS)[number]['code'];

export const LOST_NOTE_MAX_LENGTH = 500;

export function isNoteRequired(code: LostReasonCode | null): boolean {
  return code === 'OTHER';
}

export function lostReasonLabel(code: string | null | undefined): string {
  return LOST_REASONS.find((r) => r.code === code)?.label ?? 'Motivo não informado';
}

/**
 * Opção extra do modal: o contato já é cliente. Só encerra a conversa, sem
 * marcar venda perdida. Não é motivo de perda, por isso fica fora de
 * LOST_REASONS (e a API não precisa conhecê-la).
 */
export const ALREADY_CLIENT = 'ALREADY_CLIENT' as const;

export type CloseChoice = LostReasonCode | typeof ALREADY_CLIENT;

/** Tecla do atalho de "Já é cliente": a seguinte aos motivos. */
export const ALREADY_CLIENT_KEY = String(LOST_REASONS.length + 1);

/** Teclas 1–6 escolhem o motivo; a 7 escolhe "Já é cliente". */
export function choiceForKey(key: string): CloseChoice | null {
  if (key === ALREADY_CLIENT_KEY) return ALREADY_CLIENT;
  return LOST_REASONS[Number(key) - 1]?.code ?? null;
}
