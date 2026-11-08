import { MessageSquareReply, UserRoundCheck, type LucideIcon } from 'lucide-react';
import { templatesService, type Template } from '../services/templates.service';

/**
 * Papéis que um template aprovado pode ter no canal (no máximo um template
 * por papel em cada número). A lista de templates mostra um selo e um botão
 * liga/desliga para cada um.
 */
export interface TemplateMarker {
  key: 'reengagement' | 'distribution';
  field: 'isReengagement' | 'isDistribution';
  badge: string;
  Icon: LucideIcon;
  setLabel: string;
  clearLabel: string;
  setToast: string;
  clearToast: string;
  set: (id: string, channelId: string) => Promise<Template>;
  clear: (id: string, channelId: string) => Promise<Template>;
}

export const TEMPLATE_MARKERS: readonly TemplateMarker[] = [
  {
    key: 'reengagement',
    field: 'isReengagement',
    badge: 'Retomada',
    Icon: MessageSquareReply,
    setLabel: 'Usar para retomar contato',
    clearLabel: 'Deixar de usar para retomar contato',
    setToast: 'Template de retomada definido para este canal',
    clearToast: 'Template de retomada removido',
    set: templatesService.setReengagement,
    clear: templatesService.clearReengagement,
  },
  {
    key: 'distribution',
    field: 'isDistribution',
    badge: 'Distribuição',
    Icon: UserRoundCheck,
    setLabel:
      'Enviar sozinho quando o lead for distribuído com a janela de 24h fechada ({{1}} = cliente, {{2}} = vendedor)',
    clearLabel: 'Deixar de enviar na distribuição',
    setToast: 'Template de distribuição definido para este canal',
    clearToast: 'Template de distribuição removido',
    set: templatesService.setDistribution,
    clear: templatesService.clearDistribution,
  },
];

export function isMarked(template: Template, marker: TemplateMarker): boolean {
  return template[marker.field] === true;
}

/** O botão só aparece em template aprovado — ou para desmarcar um já marcado. */
export function canToggleMarker(template: Template, marker: TemplateMarker): boolean {
  return template.status === 'APPROVED' || isMarked(template, marker);
}
