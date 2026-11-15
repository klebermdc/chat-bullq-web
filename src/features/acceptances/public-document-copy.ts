import type { PublicAcceptanceView } from './types';

/**
 * Textos da página pública conforme o tipo do documento. O aceite de entrega
 * (DELIVERY, ou registro antigo sem `kind`) mantém exatamente o texto de
 * sempre; o contrato troca título, declaração e botão — o fluxo de assinatura
 * é o mesmo.
 */
export interface PublicDocumentCopy {
  isContract: boolean;
  heading: string;
  signedHeading: string;
  confirmationLabel: string;
  submitLabel: string;
  submittingLabel: string;
}

const CONTRACT_FALLBACK_TITLE = 'Contrato';

export function isContractView(view: Pick<PublicAcceptanceView, 'kind'>): boolean {
  return view.kind === 'CONTRACT';
}

export function publicDocumentCopy(
  view: Pick<PublicAcceptanceView, 'kind' | 'title'>,
  hasPolicy: boolean,
): PublicDocumentCopy {
  if (isContractView(view)) {
    return {
      isContract: true,
      heading: view.title?.trim() || CONTRACT_FALLBACK_TITLE,
      signedHeading: 'Contrato assinado!',
      confirmationLabel: hasPolicy
        ? 'Li e concordo com os termos do contrato acima e com a política de cancelamento.'
        : 'Li e concordo com os termos do contrato acima.',
      submitLabel: 'Assinar contrato',
      submittingLabel: 'Assinando…',
    };
  }
  return {
    isContract: false,
    heading: 'Confirmação de entrega',
    signedHeading: 'Aceite confirmado!',
    // O texto espelha a linha que o backend imprime no comprovante; mexer
    // aqui exige mexer lá.
    confirmationLabel: hasPolicy
      ? 'Confirmo que conferi os itens acima e está tudo correto, e que li e aceito a política de cancelamento.'
      : 'Confirmo que conferi os itens acima e está tudo correto.',
    submitLabel: 'Confirmar aceite',
    submittingLabel: 'Confirmando…',
  };
}
