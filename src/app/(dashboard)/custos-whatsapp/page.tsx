'use client';

import { useState } from 'react';
import { Lock } from 'lucide-react';
import { PageHeader, PageShell } from '@/components/layout/page-shell';
import { EmptyState } from '@/components/ui/empty-state';
import { BillingSection } from '@/features/whatsapp-costs/components/billing-section';
import { DeliverySection } from '@/features/whatsapp-costs/components/delivery-section';
import { MetaChangesCard } from '@/features/whatsapp-costs/components/meta-changes-card';
import { PeriodControl } from '@/features/whatsapp-costs/components/period-control';
import { RatesCard } from '@/features/whatsapp-costs/components/rates-card';
import {
  isForbidden,
  useBilling,
  useDelivery,
  usePricing,
} from '@/features/whatsapp-costs/hooks/use-whatsapp-costs';
import {
  DEFAULT_PERIOD,
  computePeriod,
  type PeriodKey,
  type PeriodRange,
} from '@/features/whatsapp-costs/lib/period';

interface PeriodSelection {
  period: PeriodKey;
  /** Calculado uma vez por escolha: instantes estáveis mantêm a chave do cache. */
  range: PeriodRange;
}

const selectPeriod = (period: PeriodKey): PeriodSelection => ({
  period,
  range: computePeriod(period, new Date()),
});

export default function CustosWhatsappPage() {
  const [selection, setSelection] = useState<PeriodSelection>(() => selectPeriod(DEFAULT_PERIOD));

  // Cobrança, entrega e tarifas são consultas separadas: uma falhar não apaga as outras.
  const billing = useBilling(selection.range);
  const delivery = useDelivery(selection.range);
  const pricing = usePricing();

  // A API só responde a dono e administrador. Quem chega aqui sem esse cargo
  // vê um aviso no lugar de três cartões de erro.
  const isAccessDenied = [billing.error, delivery.error, pricing.error].some(isForbidden);

  return (
    <PageShell>
      <PageHeader
        title="Custos e entrega do WhatsApp"
        description="O que a Meta marca como cobrável, quanto isso custa e como está a entrega das mensagens."
        actions={
          !isAccessDenied && (
            <PeriodControl
              value={selection.period}
              onChange={(period) => setSelection(selectPeriod(period))}
            />
          )
        }
      />

      {isAccessDenied ? (
        <EmptyState
          icon={Lock}
          title="Esta tela é só para o dono e os administradores"
          description="Os custos do WhatsApp ficam restritos a quem administra a conta. Se você precisa acompanhar esses números, peça acesso ao dono da organização."
        />
      ) : (
        <div className="mt-6 space-y-6 sm:space-y-8">
          <section aria-labelledby="whatsapp-costs-billing-title">
            <h2 id="whatsapp-costs-billing-title" className="sr-only">
              Cobrança
            </h2>
            <BillingSection query={billing} />
          </section>
          <RatesCard query={pricing} />
          <DeliverySection query={delivery} />
          <MetaChangesCard />
        </div>
      )}
    </PageShell>
  );
}
