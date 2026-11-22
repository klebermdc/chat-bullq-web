'use client';

import { Swords } from 'lucide-react';
import { usePageTitle } from '@/components/layout/use-page-title';
import { PriceResearchPanel } from '@/features/quotes/components/price-research/price-research-panel';

export default function PesquisaPrecoPage() {
  usePageTitle('Pesquisa de preço');
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
        <PriceResearchPanel />
      </div>
    </div>
  );
}
