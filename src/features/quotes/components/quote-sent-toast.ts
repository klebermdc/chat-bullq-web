import { toast } from 'sonner';

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

export { copyLink as copyQuoteLink };
