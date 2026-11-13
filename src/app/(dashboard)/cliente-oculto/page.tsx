'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { PageHeader, PageShell } from '@/components/layout/page-shell';
import { LoadingState } from '@/components/ui/empty-state';
import { NumbersTab } from '@/features/mystery-shopper/components/numbers-tab';
import { RankingTab } from '@/features/mystery-shopper/components/ranking-tab';
import { ShopperTabs, type ShopperTab } from '@/features/mystery-shopper/components/shopper-tabs';
import { SimulatorTab } from '@/features/mystery-shopper/components/simulator-tab';
import { VisitDetailView } from '@/features/mystery-shopper/components/visit-detail';
import { VisitsTab } from '@/features/mystery-shopper/components/visits-tab';
import { accessDecision } from '@/features/mystery-shopper/access';
import { useMysteryShopperAccess } from '@/features/mystery-shopper/use-access';

function MysteryShopperContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { allowed, isLoading } = useMysteryShopperAccess();
  const decision = accessDecision({ allowed, isLoading });
  const [tab, setTab] = useState<ShopperTab>('visitas');
  // A URL é a fonte da verdade da visita aberta: link direto, voltar e recarregar funcionam.
  const visitId = searchParams.get('visita');

  // Quem não está na lista volta para a inbox, como o bloqueio de permissão do layout.
  useEffect(() => {
    if (decision === 'redirect') router.replace('/inbox');
  }, [decision, router]);

  if (decision !== 'show') return <LoadingState />;

  const backToList = () => router.replace(pathname);
  const changeTab = (next: ShopperTab) => {
    if (next !== 'visitas' && visitId) router.replace(pathname);
    setTab(next);
  };

  return (
    <>
      <PageHeader
        title="Cliente oculto"
        description="Visitas de teste avaliadas por rubrica. Só você vê esta página."
      />
      <div className="mt-6 space-y-4">
        <ShopperTabs value={tab} onChange={changeTab} />
        <div role="tabpanel" id={`shopper-panel-${tab}`} aria-labelledby={`shopper-tab-${tab}`}>
          {tab === 'visitas' &&
            (visitId ? (
              <VisitDetailView id={visitId} onBack={backToList} />
            ) : (
              <VisitsTab onOpen={(id) => router.push(`${pathname}?visita=${id}`)} />
            ))}
          {tab === 'ranking' && <RankingTab />}
          {tab === 'numeros' && <NumbersTab />}
          {tab === 'simulador' && <SimulatorTab />}
        </div>
      </div>
    </>
  );
}

export default function MysteryShopperPage() {
  return (
    <PageShell>
      <Suspense fallback={<LoadingState />}>
        <MysteryShopperContent />
      </Suspense>
    </PageShell>
  );
}
