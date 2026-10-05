'use client';

import { CrmReportsPanel } from '@/features/crm-reports/components/crm-reports-panel';
import { PageHeader, PageShell } from '@/components/layout/page-shell';

/**
 * Rota mantida viva pra links e favoritos antigos. O lugar de origem dos
 * relatórios agora é a página de Marketing, depois do ranking de criativos
 * — esta página renderiza o mesmo painel.
 */
export default function RelatoriosPage() {
  return (
    <PageShell>
      <PageHeader
        title="Relatórios de CRM"
        description="Negócios, leads e conversas do período, com exportação em CSV."
      />
      <div className="mt-6">
        <CrmReportsPanel />
      </div>
    </PageShell>
  );
}
