'use client';

import { useState } from 'react';
import { DealsReport } from './deals-report';
import { LeadsReport } from './leads-report';
import { ConversationsReport } from './conversations-report';

type Source = 'deals' | 'leads' | 'conversations';

const SOURCES: { key: Source; label: string; enabled: boolean }[] = [
  { key: 'deals', label: 'Deals / Funil', enabled: true },
  { key: 'leads', label: 'Leads / Contatos', enabled: true },
  { key: 'conversations', label: 'Conversas', enabled: true },
];

/**
 * Miolo dos relatórios de CRM: as pílulas de fonte e o relatório escolhido.
 *
 * Fica sem chrome de página (sem título, sem container de largura, sem
 * scroll próprio) porque roda em dois lugares: dentro da página de
 * Marketing, depois do ranking de criativos, e na rota /relatorios, que
 * continua viva pra links antigos.
 */
export function CrmReportsPanel() {
  const [source, setSource] = useState<Source>('deals');

  return (
    <div>
      <div className="mb-5 flex gap-2">
        {SOURCES.map((s) => (
          <button
            key={s.key}
            type="button"
            disabled={!s.enabled}
            onClick={() => s.enabled && setSource(s.key)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              source === s.key
                ? 'bg-primary text-primary-foreground'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-zinc-800 dark:text-zinc-300'
            }`}
            title={s.enabled ? '' : 'Em breve'}
          >
            {s.label}
          </button>
        ))}
      </div>

      {source === 'deals' && <DealsReport />}
      {source === 'leads' && <LeadsReport />}
      {source === 'conversations' && <ConversationsReport />}
    </div>
  );
}
