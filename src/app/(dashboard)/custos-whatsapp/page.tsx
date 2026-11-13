'use client';

import { useState } from 'react';
import { Lock } from 'lucide-react';
import { PageHeader, PageShell } from '@/components/layout/page-shell';
import { EmptyState } from '@/components/ui/empty-state';
import { CostsOverview } from '@/features/whatsapp-costs/components/costs-overview';
import { PeriodControl } from '@/features/whatsapp-costs/components/period-control';
import { isForbidden, useWhatsappCosts } from '@/features/whatsapp-costs/hooks/use-whatsapp-costs';
import {
  DEFAULT_PERIOD,
  DEFAULT_TIME_ZONE,
  computePeriod,
  todayIn,
  type PeriodKey,
  type PeriodRange,
} from '@/features/whatsapp-costs/lib/period';

interface PeriodSelection {
  period: PeriodKey;
  /** Calculado uma vez por escolha: dias estáveis mantêm a chave do cache. */
  range: PeriodRange;
}

const selectPeriod = (period: PeriodKey): PeriodSelection => ({
  period,
  range: computePeriod(period, todayIn(DEFAULT_TIME_ZONE, new Date())),
});

export default function CustosWhatsappPage() {
  const [selection, setSelection] = useState<PeriodSelection>(() => selectPeriod(DEFAULT_PERIOD));
  const costs = useWhatsappCosts(selection.range);

  // A API só responde a dono e administrador; os demais veem um aviso.
  const isAccessDenied = isForbidden(costs.error);

  return (
    <PageShell>
      <PageHeader
        title="Custos do WhatsApp"
        description="Quanto a Meta cobra pelas mensagens de cada número, o que sai de graça e quem gera o custo."
        actions={
          !isAccessDenied && (
            <PeriodControl value={selection.period} onChange={(period) => setSelection(selectPeriod(period))} />
          )
        }
      />

      <div className="mt-6">
        {isAccessDenied ? (
          <EmptyState
            icon={Lock}
            title="Esta tela é só para o dono e os administradores"
            description="Os custos do WhatsApp ficam restritos a quem administra a conta. Se você precisa acompanhar esses números, peça acesso ao dono da organização."
          />
        ) : (
          <CostsOverview
            query={costs}
            range={selection.range}
            isCurrentMonth={selection.period === 'month'}
          />
        )}
      </div>
    </PageShell>
  );
}
