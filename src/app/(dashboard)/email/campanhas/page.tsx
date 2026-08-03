'use client';

import Link from 'next/link';
import { Mail, Plus, Users } from 'lucide-react';
import { useCampaigns } from '@/hooks/use-email';
import type { CampaignStatus } from '@/lib/email-api';

const STATUS_BADGE: Record<CampaignStatus, { label: string; className: string }> = {
  DRAFT: {
    label: 'Rascunho',
    className: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
  },
  SCHEDULED: {
    label: 'Agendada',
    className: 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-400',
  },
  SENDING: {
    label: 'Enviando',
    className: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400',
  },
  PAUSED: {
    label: 'Pausada',
    className: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400',
  },
  SENT: {
    label: 'Enviada',
    className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400',
  },
  FAILED: {
    label: 'Falhou',
    className: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400',
  },
  CANCELED: {
    label: 'Cancelada',
    className: 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500',
  },
};

export default function EmailCampanhasPage() {
  const campaignsQ = useCampaigns();
  const items = campaignsQ.data?.items ?? [];

  return (
    <div className="h-full min-h-0 space-y-6 overflow-y-auto p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            Campanhas de email
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Crie e acompanhe envios de email marketing para seus destinatários.
          </p>
        </div>
        <Link
          href="/email/campanhas/nova"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Nova campanha
        </Link>
      </div>

      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800">
        {campaignsQ.isLoading && (
          <div className="p-6 text-center text-sm text-zinc-500">Carregando…</div>
        )}
        {campaignsQ.isError && (
          <div className="p-6 text-center text-sm text-red-600">
            Erro ao carregar campanhas.
          </div>
        )}
        {!campaignsQ.isLoading && items.length === 0 && (
          <div className="p-10 text-center">
            <Mail className="mx-auto h-10 w-10 text-zinc-300 dark:text-zinc-600" />
            <p className="mt-3 text-sm font-medium text-zinc-600 dark:text-zinc-300">
              Nenhuma campanha criada ainda
            </p>
            <p className="mt-1 text-xs text-zinc-400">
              Clique em &quot;Nova campanha&quot; para montar o primeiro email.
            </p>
          </div>
        )}
        {items.length > 0 && (
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {items.map((c) => {
              const badge = STATUS_BADGE[c.status];
              return (
                <li key={c.id}>
                  <Link
                    href={`/email/campanhas/${c.id}`}
                    className="flex items-center gap-4 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        {c.name}
                      </p>
                      <p className="truncate text-xs text-zinc-500">{c.subject}</p>
                    </div>
                    {c.totalRecipients > 0 && (
                      <span className="flex shrink-0 items-center gap-1 text-xs text-zinc-400">
                        <Users className="h-3.5 w-3.5" />
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
    </div>
  );
}
