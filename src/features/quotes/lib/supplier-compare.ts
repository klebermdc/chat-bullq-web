import { parseMoneyBR } from '@/lib/money';
import { MAX_QUOTE_INSTALLMENTS, toMoneyInput, type QuoteDraft } from './quote-draft';
import type { StoreOffer } from '../types';

/**
 * Comparação de fornecedores na cotação de ingressos: os produtos são sempre
 * os mesmos, só o preço muda. A Just Travel (link do carrinho) costuma ganhar
 * no Pix; a Azul (print) costuma ganhar no 10x. O cliente recebe o menor de
 * cada um — e nunca o nome do fornecedor, que fica só na tela do atendente.
 * Toda função devolve um objeto novo — nada é mutado.
 */

export type Supplier = 'JUST_TRAVEL' | 'AZUL';

export const SUPPLIER_LABEL: Record<Supplier, string> = {
  JUST_TRAVEL: 'Just Travel',
  AZUL: 'Azul',
};

/** O que o atendente digitou da Azul e o que ele escolheu na mão (null = automático). */
export interface SupplierCompareState {
  azulInstallmentsTotal: string;
  azulPixTotal: string;
  pixPick: Supplier | null;
  installmentsPick: Supplier | null;
}

export const EMPTY_SUPPLIER_COMPARE: SupplierCompareState = {
  azulInstallmentsTotal: '',
  azulPixTotal: '',
  pixPick: null,
  installmentsPick: null,
};

export interface SupplierPick {
  justTravel: number | null;
  azul: number | null;
  /** Quem fica com este valor (null = nenhum dos dois tem). */
  chosen: Supplier | null;
  value: number | null;
}

export interface SupplierComparison {
  pix: SupplierPick;
  installments: SupplierPick;
}

const positive = (n: number | null | undefined): number | null => (typeof n === 'number' && Number.isFinite(n) && n > 0 ? n : null);

const parsePositive = (raw: string): number | null => positive(parseMoneyBR(raw));

/** Menor valor; empate fica com a Just Travel. A escolha manual vale se o lado tiver valor. */
function pick(justTravel: number | null, azul: number | null, manual: Supplier | null): SupplierPick {
  const valueOf = (s: Supplier) => (s === 'JUST_TRAVEL' ? justTravel : azul);
  const auto: Supplier | null =
    justTravel === null ? (azul === null ? null : 'AZUL') : azul !== null && azul < justTravel ? 'AZUL' : 'JUST_TRAVEL';
  const chosen = manual !== null && valueOf(manual) !== null ? manual : auto;
  return { justTravel, azul, chosen, value: chosen ? valueOf(chosen) : null };
}

export function compareSuppliers(offer: StoreOffer, state: SupplierCompareState): SupplierComparison {
  return {
    pix: pick(positive(offer.pixTotal), parsePositive(state.azulPixTotal), state.pixPick),
    installments: pick(positive(offer.installmentsTotal), parsePositive(state.azulInstallmentsTotal), state.installmentsPick),
  };
}

/** Parcelas da loja (padrão 10x), dentro do limite do cartão. */
export function offerInstallmentsCount(offer: StoreOffer): number {
  const count = offer.installmentsCount;
  return typeof count === 'number' && Number.isInteger(count) && count >= 1 && count <= MAX_QUOTE_INSTALLMENTS
    ? count
    : MAX_QUOTE_INSTALLMENTS;
}

/** Leva os valores escolhidos ao rascunho; o que não tem escolha fica como estava. */
export function applySupplierChoice(draft: QuoteDraft, offer: StoreOffer, comparison: SupplierComparison): QuoteDraft {
  const { pix, installments } = comparison;
  return {
    ...draft,
    pixTotal: pix.value !== null ? toMoneyInput(pix.value) : draft.pixTotal,
    total: installments.value !== null ? toMoneyInput(installments.value) : draft.total,
    installmentsCount: installments.value !== null ? String(offerInstallmentsCount(offer)) : draft.installmentsCount,
  };
}
