'use client';

import Link from 'next/link';
import { AlertCircle, Mail, Users } from 'lucide-react';
import { useCampaigns } from '@/hooks/use-email';
import type { CampaignStatus } from '@/lib/email-api';
import { EmptyState, LoadingState } from '@/components/ui/empty-state';

const NEUTRAL_BADGE = 'bg-muted text-muted-foreground';

export const STATUS_BADGE: Record<CampaignStatus, { label: string; className: string }> = {
  DRAFT: { label: 'Rascunho', className: NEUTRAL_BADGE },
  SCHEDULED: { label: 'Agendada', className: 'bg-primary/10 text-primary' },
  // Mesmo par do <Badge variant="info">: "em andamento" não é marca nem alerta.
  SENDING: { label: 'Enviando', className: 'bg-sky-500/15 text-sky-700 dark:text-sky-400' },
  PAUSED: { label: 'Pausada', className: 'bg-warning-wash text-warning-ink' },
  SENT: { label: 'Enviada', className: 'bg-success-wash text-success-ink' },
  FAILED: { label: 'Falhou', className: 'bg-urgent-wash text-urgent-ink' },
  CANCELED: { label: 'Cancelada', className: NEUTRAL_BADGE },
};

export function CampaignsView() {
  const campaignsQ = useCampaigns();
  const items = campaignsQ.data?.items ?? [];

  // Título, descrição e "Nova campanha" ficam no cabeçalho da página (/email).
  return (
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-soft">
        {campaignsQ.isLoading && <LoadingState />}
        {campaignsQ.isError && (
          <p role="alert" className="flex items-center justify-center gap-2 p-6 text-sm text-urgent-ink">
            <AlertCircle aria-hidden="true" className="h-4 w-4 shrink-0" />
            Não foi possível carregar as campanhas. Recarregue a página para tentar de novo.
          </p>
        )}
        {!campaignsQ.isLoading && !campaignsQ.isError && items.length === 0 && (
          <EmptyState
            icon={Mail}
            title="Nenhuma campanha criada ainda"
            description="Monte o primeiro email em “Nova campanha”."
            size="sm"
          />
        )}
        {items.length > 0 && (
          <ul className="divide-y divide-border">
            {items.map((c) => {
              const badge = STATUS_BADGE[c.status];
              return (
                <li key={c.id}>
                  <Link
                    href={`/email/campanhas/${c.id}`}
                    className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{c.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{c.subject}</p>
                    </div>
                    {c.totalRecipients > 0 && (
                      <span
                        className="flex shrink-0 items-center gap-1 font-mono text-xs tabular-nums text-muted-foreground"
                        title="Destinatários"
                      >
                        <Users aria-hidden="true" className="h-3.5 w-3.5" />
                        <span className="sr-only">Destinatários: </span>
                        {c.totalRecipients.toLocaleString('pt-BR')}
                      </span>
                    )}
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${badge.className}`}>
                      {badge.label}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
  );
}
