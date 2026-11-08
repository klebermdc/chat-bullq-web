export const ROUTE_FEATURE: Array<{ prefix: string; feature: string }> = [
  // Mais longo que '/settings', e requiredFeatureForPath ordena por tamanho
  // de prefixo — então o Jarvis dentro de Configurações continua gateado por
  // ai-agents.view, igual quando morava em /ai-agents. Ninguém ganha nem
  // perde acesso com a mudança de rota.
  { prefix: '/settings/jarvis', feature: 'ai-agents.view' },
  { prefix: '/settings', feature: 'settings.view' },
  { prefix: '/email', feature: 'email.view' },
  { prefix: '/relatorios-vendas', feature: 'sales-reports.view' },
  { prefix: '/relatorios', feature: 'crm-reports.view' },
  { prefix: '/automations', feature: 'automations.view' },
  { prefix: '/projects', feature: 'projects.view' },
  { prefix: '/inactivity', feature: 'inactivity.view' },
  { prefix: '/ai-agents', feature: 'ai-agents.view' },
  { prefix: '/chatbot', feature: 'chatbot.view' },
  { prefix: '/copiloto', feature: 'copilot.view' },
];

export function requiredFeatureForPath(pathname: string): string | null {
  const hit = ROUTE_FEATURE
    .filter((r) => pathname === r.prefix || pathname.startsWith(r.prefix + '/'))
    .sort((a, b) => b.prefix.length - a.prefix.length)[0];
  return hit?.feature ?? null;
}
