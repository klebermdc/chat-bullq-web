import type { ReactNode } from 'react';
import { Card } from '@/components/ui/card';

/** Bloco com título da aba Indicadores. */
export function KpiSection({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <Card className="p-4" role="region" aria-labelledby={id}>
      <h2 id={id} className="mb-3 text-sm font-semibold">
        {title}
      </h2>
      {children}
    </Card>
  );
}
