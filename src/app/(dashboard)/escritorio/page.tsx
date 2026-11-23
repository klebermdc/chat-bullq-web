'use client';

import { useState } from 'react';
import { usePageTitle } from '@/components/layout/use-page-title';
import { EmptyState } from '@/components/ui/empty-state';
import { OfficeMap } from '@/features/virtual-hq/components/office-map';
import { RoomPanel } from '@/features/virtual-hq/components/room-panel';
import { useVirtualHqSnapshot } from '@/features/virtual-hq/use-virtual-hq';

export default function EscritorioPage() {
  usePageTitle('Escritório');
  const { data, isLoading, isError } = useVirtualHqSnapshot();
  const [selected, setSelected] = useState<string | null>(null);

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
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 p-4 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1">
          <p className="mb-2 text-xs text-muted-foreground">
            Clique numa sala para ver a carteira. Quadradinhos amarelos são clientes esperando resposta.
          </p>
          <OfficeMap snapshot={data} selectedKey={selected} onSelect={setSelected} />
        </div>
        {selected && (
          <RoomPanel
            snapshot={data}
            selectedKey={selected}
            onClose={() => setSelected(null)}
            className="w-full lg:sticky lg:top-4 lg:w-96"
          />
        )}
      </div>
    </div>
  );
}
