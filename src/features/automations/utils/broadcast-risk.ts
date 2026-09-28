import type {
  ActionDefinition,
  ActionType,
  Automation,
  AutomationTrigger,
} from '../services/automations.service';

// Ações que falam com o cliente.
const MESSAGING_ACTIONS: ReadonlySet<ActionType> = new Set<ActionType>([
  'send_message',
  'send_private_reply',
]);

interface RiskInput {
  trigger: AutomationTrigger;
  conditions: Automation['conditions'];
  actions: ActionDefinition[];
}

function hasAnyRule(conditions: Automation['conditions']): boolean {
  const groups = 'groups' in conditions ? conditions.groups : [];
  return groups.some((g) => g.rules.length > 0);
}

/**
 * "Mensagem recebida" sem nenhuma condição roda em toda mensagem de todo
 * cliente, em todos os canais. Com uma ação que envia mensagem, isso é um
 * robô respondendo a tudo — nunca é o que o gestor quer.
 */
export function isBroadcastRisk({ trigger, conditions, actions }: RiskInput): boolean {
  if (trigger !== 'MESSAGE_RECEIVED') return false;
  if (hasAnyRule(conditions)) return false;
  return actions.some((a) => MESSAGING_ACTIONS.has(a.type));
}

export const BROADCAST_RISK_MESSAGE =
  'Esta automação responderia a toda mensagem de todo cliente, em todos os canais. Adicione pelo menos uma condição (canal, tag, texto…) antes de ligar.';
