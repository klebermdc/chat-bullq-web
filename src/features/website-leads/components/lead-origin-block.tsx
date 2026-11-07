'use client';

import { useQuery } from '@tanstack/react-query';
import { websiteLeadsService } from '../services/website-leads.service';
import { followupLabel, originRows } from '../lib/website-leads';

const DATE_FMT = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

/**
 * Bloco "Origem" do contato: de onde o lead veio (site com UTM, anúncio de
 * WhatsApp) e o histórico de formulários com a situação do retorno.
 * Não renderiza nada quando não há origem registrada.
 */
export function LeadOriginBlock({
  contactId,
  enabled = true,
  wrap,
}: {
  contactId: string | null | undefined;
  enabled?: boolean;
  /** Embrulho da seção (cada tela tem o seu `Section`). */
  wrap: (content: React.ReactNode) => React.ReactNode;
}) {
  const { data } = useQuery({
    queryKey: ['contact-origin', contactId],
    queryFn: () => websiteLeadsService.contactOrigin(contactId as string),
    enabled: enabled && !!contactId,
    staleTime: 60_000,
  });
  const rows = originRows(data);
  const submissions = data?.submissions ?? [];
  if (rows.length === 0 && submissions.length === 0) return null;

  return wrap(
    <div className="space-y-3">
      {rows.length > 0 && (
        <dl className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border bg-card text-sm">
          {rows.map((r) => (
            <div key={r.label} className="flex items-start justify-between gap-3 px-3 py-2">
              <dt className="shrink-0 text-muted-foreground">{r.label}</dt>
              <dd className="min-w-0 break-words text-right font-medium text-foreground">{r.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {submissions.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-medium text-muted-foreground">
            Formulários do site ({submissions.length})
          </p>
          <ul className="space-y-1 text-xs">
            {submissions.map((s) => (
              <li key={s.id} className="flex flex-wrap items-baseline justify-between gap-x-2 text-foreground">
                <span className="tabular-nums">
                  {DATE_FMT.format(new Date(s.createdAt))}
                  {s.formKind === 'guiamento' ? ' · guiamento' : ''}
                  {s.source ? ` · ${s.source}` : ''}
                </span>
                <span className="text-muted-foreground">{followupLabel(s.followupStatus, s.followupReason)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>,
  );
}
