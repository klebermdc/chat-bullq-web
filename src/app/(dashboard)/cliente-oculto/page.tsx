'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { PageHeader, PageShell } from '@/components/layout/page-shell';
import { LoadingState } from '@/components/ui/empty-state';
import { NumbersTab } from '@/features/mystery-shopper/components/numbers-tab';
import { RankingTab } from '@/features/mystery-shopper/components/ranking-tab';
import { ShopperTabs, type ShopperTab } from '@/features/mystery-shopper/components/shopper-tabs';
import { VisitDetailView } from '@/features/mystery-shopper/components/visit-detail';
import { VisitsTab } from '@/features/mystery-shopper/components/visits-tab';
import { useMysteryShopperAccess } from '@/features/mystery-shopper/use-access';

function MysteryShopperContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { allowed, isLoading } = useMysteryShopperAccess();
  const [tab, setTab] = useState<ShopperTab>('visitas');
  const [visitId, setVisitId] = useState<string | null>(searchParams.get('visita'));

  // Quem não está na lista volta para a inbox, como o bloqueio de permissão do layout.
  useEffect(() => {
    if (!isLoading && !allowed) router.replace('/inbox');
  }, [allowed, isLoading, router]);

  if (isLoading || !allowed) return <LoadingState />;

  return (
    <>
      <PageHeader
        title="Cliente oculto"
        description="Visitas de teste avaliadas por rubrica. Só você vê esta página."
      />
      <div className="mt-6 space-y-4">
        <ShopperTabs value={tab} onChange={setTab} />
        {tab === 'visitas' &&
          (visitId ? <VisitDetailView id={visitId} onBack={() => setVisitId(null)} /> : <VisitsTab onOpen={setVisitId} />)}
        {tab === 'ranking' && <RankingTab />}
        {tab === 'numeros' && <NumbersTab />}
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
