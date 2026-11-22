'use client';

import { useState } from 'react';
import { Swords } from 'lucide-react';
import { usePageTitle } from '@/components/layout/use-page-title';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';
import { PriceResearchPanel } from '@/features/quotes/components/price-research/price-research-panel';
import { PriceWatchPanel } from '@/features/quotes/components/price-watch/price-watch-panel';

type Tab = 'search' | 'trends';

const TABS: ReadonlyArray<{ value: Tab; label: string }> = [
  { value: 'search', label: 'Pesquisar' },
  { value: 'trends', label: 'Tendências' },
];

const STAFF_ROLES = new Set(['OWNER', 'ADMIN']);

export default function PesquisaPrecoPage() {
  usePageTitle('Pesquisa de preço');
  const [tab, setTab] = useState<Tab>('search');
  const role = useAuthStore((s) => s.organizations.find((o) => o.id === s.activeOrgId)?.role ?? null);
  // Trocar a cesta e coletar na hora: só Proprietário e Admin (a API também barra).
  const canManage = !!role && STAFF_ROLES.has(role);

  return (
    // O layout do painel prende a altura: a página rola por conta própria (como /cotacoes).
    <div className="h-full min-h-0 overflow-y-auto">
      <div className="mx-auto w-full max-w-3xl space-y-4 p-4">
        <header className="space-y-1">
          <h1 className="flex items-center gap-2 text-lg font-semibold">
            <Swords className="size-5 text-primary" />
            Pesquisa de preço
          </h1>
          <p className="text-sm text-muted-foreground">
            Cole o link do carrinho da OFP. Cada item é comparado com as lojas concorrentes, na mesma data e com as
            mesmas pessoas. Nada é gravado e o cliente não vê.
          </p>
        </header>
        <div role="tablist" aria-label="Pesquisa de preço" className="inline-flex rounded-lg bg-muted p-0.5">
          {TABS.map((t) => (
            <button
              key={t.value}
              type="button"
              role="tab"
              aria-selected={t.value === tab}
              onClick={() => setTab(t.value)}
              className={cn(
                'h-8 rounded-md px-3 text-sm font-medium transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                t.value === tab
                  ? 'bg-background text-foreground shadow-soft'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        {tab === 'search' ? <PriceResearchPanel /> : <PriceWatchPanel canManage={canManage} />}
      </div>
    </div>
  );
}
