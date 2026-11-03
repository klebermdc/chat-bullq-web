import { toast } from 'sonner';
import type { QuoteNotice } from '@/features/proposals/types';

const TOAST_DURATION_MS = 15000;

async function copyLink(url: string) {
  try {
    await navigator.clipboard.writeText(url);
    toast.success('Link copiado.');
  } catch {
    toast.error('Não consegui copiar. Selecione o link e copie à mão.');
  }
}

/** Depois do envio: confirma e deixa o link à mão para copiar. */
export function notifyQuoteSent(url: string | null | undefined) {
  if (!url) {
    toast.success('Cotação enviada ao cliente.');
    return;
  }
  toast.success('Cotação enviada ao cliente.', {
    description: url,
    duration: TOAST_DURATION_MS,
    action: { label: 'Copiar link', onClick: () => void copyLink(url) },
  });
}

const UPDATED_TITLE: Record<QuoteNotice, string> = {
  TEXT: 'Cotação atualizada e cliente avisado.',
  TEMPLATE: 'Cotação atualizada. A janela de 24h estava fechada, então o aviso foi pelo template.',
  NO_TEMPLATE: 'Cotação atualizada, mas o cliente NÃO foi avisado.',
  OFF: 'Cotação atualizada. O cliente não foi avisado.',
};

const NO_TEMPLATE_HELP =
  'A janela de 24h está fechada e o template "cotacao_atualizada" não está aprovado neste número. ' +
  'Copie o link e mande quando o cliente responder.';

/** Depois de atualizar: o link é o mesmo de antes. Sem `notice` (API antiga), vale o que o atendente marcou. */
export function notifyQuoteUpdated(url: string | null | undefined, notice: QuoteNotice | undefined, notified: boolean) {
  const kind: QuoteNotice = notice ?? (notified ? 'TEXT' : 'OFF');
  const show = kind === 'NO_TEMPLATE' ? toast.warning : toast.success;
  const linkLine = url ? `Mesmo link: ${url}` : null;
  const description = kind === 'NO_TEMPLATE' ? [NO_TEMPLATE_HELP, linkLine].filter(Boolean).join(' ') : linkLine;
  show(UPDATED_TITLE[kind], {
    ...(description ? { description } : {}),
    duration: TOAST_DURATION_MS,
    ...(url ? { action: { label: 'Copiar link', onClick: () => void copyLink(url) } } : {}),
  });
}

export { copyLink as copyQuoteLink };
