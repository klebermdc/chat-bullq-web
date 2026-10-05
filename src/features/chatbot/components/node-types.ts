import {
  Clock,
  Flag,
  GitBranch,
  ListChecks,
  MessageSquare,
  Play,
  UserRoundCheck,
  type LucideIcon,
} from 'lucide-react';

/**
 * Nome, ícone e cor de cada tipo de nó do fluxo — um lugar só para a barra
 * de ferramentas, o nó no quadro e o painel de propriedades. A cor identifica
 * o tipo (categoria), não um estado.
 */
export interface NodeTypeMeta {
  label: string;
  icon: LucideIcon;
  color: string;
}

export const NODE_TYPE_META: Record<string, NodeTypeMeta> = {
  START: { label: 'Início', icon: Play, color: 'bg-emerald-600' },
  MESSAGE: { label: 'Mensagem', icon: MessageSquare, color: 'bg-blue-600' },
  MENU: { label: 'Menu', icon: ListChecks, color: 'bg-violet-600' },
  CONDITION: { label: 'Condição', icon: GitBranch, color: 'bg-amber-600' },
  WAIT: { label: 'Aguardar resposta', icon: Clock, color: 'bg-cyan-700' },
  TRANSFER: { label: 'Transferir', icon: UserRoundCheck, color: 'bg-rose-600' },
  END_FLOW: { label: 'Fim', icon: Flag, color: 'bg-zinc-600' },
};

/** Tipos que o usuário pode adicionar pelo quadro (o início já vem no fluxo). */
export const ADDABLE_NODE_TYPES = ['MESSAGE', 'MENU', 'CONDITION', 'WAIT', 'TRANSFER', 'END_FLOW'] as const;

export function nodeTypeLabel(type: string | undefined): string {
  if (!type) return 'Nó';
  return NODE_TYPE_META[type]?.label ?? type.replace(/_/g, ' ').toLowerCase();
}
