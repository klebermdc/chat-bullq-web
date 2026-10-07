/**
 * Regra de aceitação dos prints anexados à proposta. O backend valida de novo
 * (máx. 4, png/jpeg/webp); aqui barramos antes de subir pra dizer ao atendente
 * qual arquivo ficou de fora e por quê.
 */

export const MAX_PROPOSAL_PRINTS = 4;
export const MAX_PRINT_BYTES = 10 * 1024 * 1024;
export const ACCEPTED_PRINT_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;
/** Valor do `accept` do seletor de arquivo. */
export const PRINT_ACCEPT_ATTR = ACCEPTED_PRINT_TYPES.join(',');

export interface PrintRejection {
  name: string;
  reason: string;
}

export interface PrintIntakeResult {
  accepted: File[];
  rejected: PrintRejection[];
}

const FALLBACK_NAME = 'arquivo';
const MAX_PRINT_MB = MAX_PRINT_BYTES / 1024 / 1024;

/** Motivo da recusa olhando só o arquivo (tipo e tamanho), ou null se serve. */
function fileProblem(file: File): string | null {
  if (!(ACCEPTED_PRINT_TYPES as readonly string[]).includes(file.type)) {
    return 'só aceito imagem PNG, JPG ou WebP';
  }
  if (file.size === 0) return 'está vazio';
  if (file.size > MAX_PRINT_BYTES) return `passa de ${MAX_PRINT_MB}MB`;
  return null;
}

/**
 * Separa o que entra do que fica de fora. `alreadyAttached` conta os prints
 * que já estão no diálogo; arquivo recusado por tipo/tamanho não gasta vaga.
 */
export function acceptPrints(files: File[], alreadyAttached: number): PrintIntakeResult {
  const slotsLeft = Math.max(0, MAX_PROPOSAL_PRINTS - alreadyAttached);
  return files.reduce<PrintIntakeResult>(
    (result, file) => {
      const name = file.name || FALLBACK_NAME;
      const reason =
        fileProblem(file) ??
        (result.accepted.length >= slotsLeft
          ? `o limite é ${MAX_PROPOSAL_PRINTS} prints por proposta`
          : null);
      if (reason) {
        return { ...result, rejected: [...result.rejected, { name, reason }] };
      }
      return { ...result, accepted: [...result.accepted, file] };
    },
    { accepted: [], rejected: [] },
  );
}

const LINK_PATTERN = /https?:\/\//i;

/** True quando o texto colado traz um link (http/https). */
export function textHasLink(text: string): boolean {
  return LINK_PATTERN.test(text);
}

/**
 * Planilha e Word copiam o texto E uma imagem dele. Nesse caso o atendente
 * quer colar o texto (o resumo do carrinho), não anexar a foto da seleção.
 * Print de tela e "copiar imagem" não trazem text/plain; arquivo copiado do
 * Finder traz só text/plain (o nome), sem html/rtf.
 */
export function pasteIsRichText(types: readonly string[]): boolean {
  if (!types.includes('text/plain')) return false;
  return types.includes('text/html') || types.includes('text/rtf');
}
