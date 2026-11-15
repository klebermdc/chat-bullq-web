'use client';

import { PageHeader, PageShell } from '@/components/layout/page-shell';
import { MailboxScreen } from '@/features/mailbox/components/mailbox-screen';

export default function ReservasPage() {
  return (
    <PageShell>
      <PageHeader
        title="Reservas"
        description="Cópia só de leitura da caixa reservas@. Para responder, continue pelo Gmail."
      />
      <div className="mt-6">
        <MailboxScreen />
      </div>
    </PageShell>
  );
}
