'use client';

import { usePageTitle } from '@/components/layout/use-page-title';
import { EmptyState } from '@/components/ui/empty-state';
import { OfficeWorld } from '@/features/virtual-hq/components/office-world';
import { useVirtualHqSnapshot } from '@/features/virtual-hq/use-virtual-hq';

export default function EscritorioPage() {
  usePageTitle('Escritório');
  const { data, isLoading, isError } = useVirtualHqSnapshot();

  if (isLoading) return <p className="p-6 text-sm text-muted-foreground">Abrindo o escritório…</p>;
  if (isError) return <p className="p-6 text-sm text-destructive">Não deu para carregar o escritório. Tente de novo.</p>;
  if (!data) {
    return (
      <div className="p-6">
        <EmptyState title="Escritório desligado" description="Peça ao administrador para ativar o escritório virtual." />
      </div>
    );
  }

  return (
    <div className="h-full min-h-0 overflow-y-auto">
      <OfficeWorld snapshot={data} />
    </div>
  );
}
