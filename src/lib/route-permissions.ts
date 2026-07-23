export const ROUTE_FEATURE: Array<{ prefix: string; feature: string }> = [
  { prefix: '/settings', feature: 'settings.view' },
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
