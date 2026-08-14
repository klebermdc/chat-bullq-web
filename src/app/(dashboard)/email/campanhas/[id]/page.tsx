'use client';

import { use } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, ArrowLeft, Pencil, RefreshCw, Send } from 'lucide-react';
import { useCampaign, useCampaignStats, useSendCampaign } from '@/hooks/use-email';
import { emailApi } from '@/lib/email-api';
import { extractErrorMessage } from '@/features/email/editor/error-message';
import { AudienceFilterPanel } from '@/features/email/audience/audience-filter-panel';
import { useCampaignAudience } from '@/features/email/audience/use-campaign-audience';
import { isAudienceFilterEmpty } from '@/features/email/audience/audience-filter.util';
import { STATUS_BADGE } from '@/features/email/components/campaigns-view';

export default function CampanhaDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const campaignQ = useCampaign(id);
  const campaign = campaignQ.data;
  const isSending = campaign?.status === 'SENDING';

  const statsQ = useCampaignStats(id, isSending);
  const stats = statsQ.data;

  const qc = useQueryClient();

  const sendMutation = useSendCampaign(id);
  const audience = useCampaignAudience(campaign);

  const resumeMutation = useMutation({
    mutationFn: () => emailApi.resumeCampaign(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['email', 'campaign', id] });
      qc.invalidateQueries({ queryKey: ['email', 'stats', id] });
    },
  });

  const showFailures = Boolean(stats && stats.failed + stats.bounced > 0);
  const failuresQ = useQuery({
    queryKey: ['email', 'failures', id],
    queryFn: () => emailApi.failures(id),
    enabled: showFailures,
  });

  if (campaignQ.isLoading) {
    return <div className="p-6 text-center text-sm text-zinc-500">Carregando…</div>;
  }

  if (campaignQ.isError || !campaign) {
    return (
      <div className="p-6 text-center text-sm text-red-600">
        Não foi possível carregar esta campanha.
      </div>
    );
  }

  const badge = STATUS_BADGE[campaign.status];
  const progressPct =
    stats && stats.total > 0
      ? Math.round(((stats.total - stats.pending) / stats.total) * 100)
      : 0;

  return (
    <div className="mx-auto h-full min-h-0 w-full max-w-3xl space-y-6 overflow-y-auto p-6">
      <Link
        href="/email/campanhas"
        className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Campanhas
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            {campaign.name}
          </h1>
          <p className="mt-1 truncate text-sm text-zinc-500">{campaign.subject}</p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${badge.className}`}>
          {badge.label}
        </span>
      </div>

      {campaign.status === 'DRAFT' && (
        <>
          <AudienceFilterPanel audience={audience} />

          <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <p className="text-sm text-amber-800 dark:text-amber-300">
                {isAudienceFilterEmpty(audience.currentFilter) ? (
                  <>
                    Ao disparar, o email vai para <strong>todos os inscritos ativos</strong>.
                  </>
                ) : (
                  <>
                    Ao disparar, o email vai só para quem casa com o{' '}
                    <strong>público filtrado acima</strong>.
                  </>
                )}{' '}
                Essa ação <strong>não pode ser desfeita</strong> — revise o assunto e o
                conteúdo antes de confirmar.
              </p>
            </div>

            {sendMutation.isError && (
              <p className="text-sm text-red-700 dark:text-red-400">
                {extractErrorMessage(sendMutation.error)}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href={`/email/campanhas/${id}/editar`}
                className="inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-white px-4 py-2.5 text-sm font-medium text-amber-800 shadow-sm hover:bg-amber-50 dark:border-amber-800 dark:bg-zinc-900 dark:text-amber-300 dark:hover:bg-zinc-800"
              >
                <Pencil className="h-4 w-4" />
                Editar conteúdo
              </Link>
              <button
                onClick={() => {
                  const count = audience.countQ.data?.count;
                  if (count == null) return;
                  const confirmed = window.confirm(
                    `Disparar para ${count.toLocaleString('pt-BR')} pessoas? Não dá para desfazer.`,
                  );
                  if (confirmed) sendMutation.mutate();
                }}
                disabled={sendMutation.isPending || audience.dirty || audience.countQ.data?.count == null}
                title={
                  audience.dirty
                    ? 'Salve o filtro de público antes de disparar'
                    : undefined
                }
                className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-amber-700 disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                {sendMutation.isPending ? 'Disparando…' : 'Disparar campanha'}
              </button>
            </div>
          </div>
        </>
      )}

      {campaign.status === 'SENDING' && (
        <div className="space-y-3 rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950">
          <div className="flex items-center justify-between text-sm text-blue-800 dark:text-blue-300">
            <span>Enviando…</span>
            <span className="tabular-nums font-medium">{progressPct}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-blue-200/60 dark:bg-blue-900/60">
            <div
              className="h-full rounded-full bg-blue-600 transition-all dark:bg-blue-400"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          {resumeMutation.isError && (
            <p className="text-sm text-red-700 dark:text-red-400">
              {extractErrorMessage(resumeMutation.error)}
            </p>
          )}

          <button
            onClick={() => resumeMutation.mutate()}
            disabled={resumeMutation.isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
          >
            <RefreshCw className="h-4 w-4" />
            {resumeMutation.isPending ? 'Retomando…' : 'Retomar'}
          </button>

          <p className="text-xs text-blue-700/80 dark:text-blue-400/80">
            Retomar é seguro: reenvia só quem ainda está pendente e nunca duplica um envio
            já feito.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricCard label="Destinatários" value={stats?.total} />
        <MetricCard label="Entregues" value={stats?.delivered} />
        <MetricCard label="Aberturas" value={stats?.opened} />
        <MetricCard label="Cliques" value={stats?.clicked} />
        <MetricCard label="Pendentes" value={stats?.pending} />
        <MetricCard label="Bounce" value={stats?.bounced} />
        <MetricCard label="Spam" value={stats?.complained} />
        <MetricCard label="Falhas" value={stats?.failed} />
      </div>

      {showFailures && (
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800">
          <div className="border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Falhas de envio
            </h2>
            <p className="mt-0.5 text-xs text-zinc-500">
              Motivo real devolvido pelo provedor de email para cada endereço.
            </p>
          </div>

          {failuresQ.isLoading && (
            <div className="p-4 text-center text-sm text-zinc-500">Carregando falhas…</div>
          )}
          {failuresQ.isError && (
            <div className="p-4 text-center text-sm text-red-600">
              Não foi possível carregar as falhas.
            </div>
          )}
          {failuresQ.data && failuresQ.data.length > 0 && (
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {failuresQ.data.map((f, i) => (
                <li key={`${f.to}-${i}`} className="px-4 py-3">
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{f.to}</p>
                  <p className="mt-0.5 text-xs text-red-600 dark:text-red-400">
                    {f.failedReason?.trim() || 'Motivo não informado pelo provedor.'}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: number | undefined }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="mt-1 tabular-nums text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        {value != null ? value.toLocaleString('pt-BR') : '—'}
      </p>
    </div>
  );
}
