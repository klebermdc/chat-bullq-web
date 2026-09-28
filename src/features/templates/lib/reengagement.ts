import type { Template } from '../services/templates.service';

/**
 * Template de retomada do canal (o que o ícone "Retomar contato" abre).
 * Só vale se ainda estiver aprovado: a Meta pode pausar ou desativar depois
 * da marcação, e aí o envio falharia.
 */
export function findReengagementTemplate(
  templates: readonly Template[] | undefined,
): Template | null {
  return templates?.find((t) => t.isReengagement && t.status === 'APPROVED') ?? null;
}
