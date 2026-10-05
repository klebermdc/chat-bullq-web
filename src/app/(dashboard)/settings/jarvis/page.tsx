'use client';

import { useSearchParams } from 'next/navigation';
import { AgentsList } from '@/features/ai-agents/components/agents-list';
import { JarvisOverviewTab } from '@/features/ai-agents/components/jarvis/overview-tab';
import { JarvisAgentTab } from '@/features/ai-agents/components/jarvis/agent-tab';
import { JarvisSkillsTab } from '@/features/ai-agents/components/jarvis/skills-tab';
import { JarvisToolsTab } from '@/features/ai-agents/components/jarvis/tools-tab';
import { JarvisRunsTab } from '@/features/ai-agents/components/jarvis/runs-tab';
import { JarvisWatchdogTab } from '@/features/ai-agents/components/jarvis/watchdog-tab';
import { SettingsPageHeader } from '@/features/settings/components/settings-page-header';

type Tab = 'overview' | 'agents' | 'skills' | 'tools' | 'agent' | 'runs' | 'watchdog';

const TAB_META: Record<Tab, { label: string }> = {
  overview: { label: 'Visão geral' },
  agents: { label: 'Agentes' },
  skills: { label: 'Skills' },
  tools: { label: 'Tools' },
  runs: { label: 'Execuções' },
  watchdog: { label: 'Watchdog' },
  agent: { label: 'Por agente' },
};

const VALID_TABS: Tab[] = ['overview', 'agents', 'skills', 'tools', 'runs', 'watchdog', 'agent'];

/**
 * Jarvis agora mora dentro de Configurações. A troca de aba vem do menu
 * lateral de Configurações (grupo "Jarvis"), lido daqui por `?tab=`.
 *
 * O chrome de página antigo (wrapper de altura cheia + barra branca de
 * topo) saiu: quem dá o container e o título é o SettingsLayout.
 */
export default function JarvisPage() {
  const searchParams = useSearchParams();
  const raw = (searchParams.get('tab') ?? 'overview') as Tab;
  const tab: Tab = VALID_TABS.includes(raw) ? raw : 'overview';
  const meta = TAB_META[tab];

  return (
    <div>
      <div className="mb-4">
        <SettingsPageHeader title={`Jarvis · ${meta.label}`} />
      </div>

      {tab === 'overview' && <JarvisOverviewTab />}
      {tab === 'agents' && <AgentsList />}
      {tab === 'skills' && <JarvisSkillsTab />}
      {tab === 'tools' && <JarvisToolsTab />}
      {tab === 'runs' && <JarvisRunsTab />}
      {tab === 'watchdog' && <JarvisWatchdogTab />}
      {tab === 'agent' && <JarvisAgentTab />}
    </div>
  );
}
