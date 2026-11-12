/** idle = parado; uploading = subindo os prints; reading = lendo (prints ou link da loja); creating = enviando. */
export type SubmitPhase = 'idle' | 'uploading' | 'reading' | 'creating';

interface LabelInput {
  phase: SubmitPhase;
  hasReview: boolean;
  /** Formato página com link (o padrão). */
  isLinkFlow: boolean;
  /** Cotação lida do link do carrinho da Just Travel, sem print. */
  isStoreFlow: boolean;
}

/** Texto do botão principal do modal "Enviar cotação". */
export function submitLabel({ phase, hasReview, isLinkFlow, isStoreFlow }: LabelInput): string {
  if (phase === 'uploading') return 'Enviando prints…';
  if (phase === 'reading') return isStoreFlow ? 'Lendo o link da loja…' : 'Lendo prints…';
  if (!hasReview) return isStoreFlow ? 'Ler link' : 'Ler prints';
  return isLinkFlow ? 'Enviar link ao cliente' : 'Enviar ao cliente';
}
