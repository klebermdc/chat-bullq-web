import { toast } from 'sonner';

/** Copia um texto e avisa o resultado; na falha, mostra o texto para copiar à mão. */
export async function copyText(text: string, successMessage: string, failureLabel = 'Texto'): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(successMessage);
    return true;
  } catch {
    toast.error(`Não foi possível copiar. ${failureLabel}: ${text}`);
    return false;
  }
}

/** Copia o link de assinatura e avisa o resultado. */
export async function copyContractLink(link: string): Promise<void> {
  await copyText(link, 'Link copiado.', 'Link');
}
