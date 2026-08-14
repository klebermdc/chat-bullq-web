'use client';

import { CrmReportsPanel } from '@/features/crm-reports/components/crm-reports-panel';

/**
 * Rota mantida viva pra links e favoritos antigos. O lugar de origem dos
 * relatórios agora é a página de Marketing, depois do ranking de criativos
 * — esta página renderiza o mesmo painel.
 */
export default function RelatoriosPage() {
  return (
    <div className="h-full min-h-0 overflow-y-auto">
      <div className="mx-auto w-full max-w-6xl p-4 lg:p-6">
        <h1 className="mb-4 text-xl font-semibold text-zinc-900 dark:text-zinc-100">
          Relatórios
        </h1>
        <CrmReportsPanel />
      </div>
    </div>
  );
}
