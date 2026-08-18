import {
  ActionType,
  AutomationTrigger,
  ConditionOperator,
} from '../services/automations.service';

// Labels in pt-BR. Centralized so the UI doesn't sprinkle string literals
// everywhere — adding a new trigger/action/operator should only require
// editing this file plus the registry in the backend.

export const TRIGGER_LABELS: Record<AutomationTrigger, string> = {
  TAG_ADDED: 'Tag adicionada',
  TAG_REMOVED: 'Tag removida',
  MESSAGE_RECEIVED: 'Mensagem recebida',
  CONVERSATION_STATUS_CHANGED: 'Status da conversa mudou',
  CONVERSATION_ASSIGNED: 'Conversa atribuída',
  COMMENT_RECEIVED: 'Comentário recebido',
};

export const TRIGGER_DESCRIPTIONS: Record<AutomationTrigger, string> = {
  TAG_ADDED: 'Quando uma tag for aplicada a uma conversa ou contato',
  TAG_REMOVED: 'Quando uma tag for removida de uma conversa ou contato',
  MESSAGE_RECEIVED: 'Quando uma mensagem for recebida de um cliente',
  CONVERSATION_STATUS_CHANGED:
    'Quando o status de uma conversa mudar (ex: PENDING → OPEN)',
  CONVERSATION_ASSIGNED:
    'Quando uma conversa for atribuída a um agente',
  COMMENT_RECEIVED:
    'Quando alguém comentar num post ou Reel do Instagram ou da Página',
};

export const ACTION_LABELS: Record<ActionType, string> = {
  add_tag: 'Adicionar tag',
  remove_tag: 'Remover tag',
  add_to_pipeline: 'Adicionar a um pipeline',
  move_pipeline_stage: 'Mover entre estágios do pipeline',
  assign_user: 'Atribuir a um usuário',
  send_message: 'Enviar mensagem',
  send_private_reply: 'Responder no privado (DM)',
  reply_public_comment: 'Responder no comentário',
};

export const OPERATOR_LABELS: Record<ConditionOperator, string> = {
  equals: 'igual a',
  not_equals: 'diferente de',
  contains: 'contém',
  not_contains: 'não contém',
  in: 'está em',
  not_in: 'não está em',
  is_set: 'está preenchido',
  is_not_set: 'não está preenchido',
};

export const FIELD_LABELS: Record<string, string> = {
  tagId: 'Tag',
  target: 'Aplicado em',
  contactId: 'Contato',
  conversationId: 'Conversa',
  channelId: 'Canal',
  body: 'Texto da mensagem',
  type: 'Tipo de mensagem',
  hasAttachment: 'Tem anexo',
  storyKind: 'Interação com Story',
  fromStatus: 'Status anterior',
  toStatus: 'Novo status',
  fromAssigneeId: 'Atribuído anterior',
  toAssigneeId: 'Novo atribuído',
  postId: 'Post ou Reel',
  isReply: 'É resposta a outro comentário',
};

export function operatorsForField(field: string): ConditionOperator[] {
  // storyKind aceita is_set/is_not_set porque "é qualquer tipo de story" é a
  // regra mais útil do campo, e sem esses operadores ela não existe.
  // isReply é booleano: só comparação direta faz sentido.
  if (field === 'isReply') {
    return ['equals', 'not_equals'];
  }
  if (field === 'storyKind') {
    return ['equals', 'not_equals', 'is_set', 'is_not_set'];
  }
  // Boolean-like fields skip the value-comparison operators.
  if (field === 'hasAttachment' || field === 'target') {
    return ['equals', 'not_equals'];
  }
  if (field === 'body') {
    return ['contains', 'not_contains', 'equals', 'is_set', 'is_not_set'];
  }
  return [
    'equals',
    'not_equals',
    'in',
    'not_in',
    'is_set',
    'is_not_set',
  ];
}
