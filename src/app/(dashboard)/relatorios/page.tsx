'use client';

import { useState } from 'react';
import { DealsReport } from '@/features/crm-reports/components/deals-report';
import { LeadsReport } from '@/features/crm-reports/components/leads-report';

type Source = 'deals' | 'leads' | 'conversations';

const SOURCES: { key: Source; label: string; enabled: boolean }[] = [
  { key: 'deals', label: 'Deals / Funil', enabled: true },
  { key: 'leads', label: 'Leads / Contatos', enabled: true },
  { key: 'conversations', label: 'Conversas', enabled: false },
];

export default function RelatoriosPage() {
  const [source, setSource] = useState<Source>('deals');
  return (
    <div className="h-full min-h-0 overflow-y-auto">
      <div className="mx-auto w-full max-w-6xl p-4 lg:p-6">
        <h1 className="mb-4 text-xl font-semibold text-zinc-900 dark:text-zinc-100">
          Relatórios
        </h1>
        <div className="mb-5 flex gap-2">
          {SOURCES.map((s) => (
            <button
              key={s.key}
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
      </div>
    </div>
  );
}
