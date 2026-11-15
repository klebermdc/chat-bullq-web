import { toast } from 'sonner';

/** Copia o link de assinatura e avisa o resultado. */
export async function copyContractLink(link: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(link);
    toast.success('Link copiado.');
  } catch {
    toast.error('Não foi possível copiar. Link: ' + link);
  }
}
