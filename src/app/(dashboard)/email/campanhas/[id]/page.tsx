'use client';

import { use } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, AlertTriangle, ArrowLeft, Pencil, RefreshCw, Send } from 'lucide-react';
import { useCampaign, useCampaignStats, useSendCampaign } from '@/hooks/use-email';
import { usePageTitle } from '@/components/layout/use-page-title';
import { emailApi } from '@/lib/email-api';
import { extractErrorMessage } from '@/features/email/editor/error-message';
import { AudienceFilterPanel } from '@/features/email/audience/audience-filter-panel';
import { useCampaignAudience } from '@/features/email/audience/use-campaign-audience';
import { isAudienceFilterEmpty } from '@/features/email/audience/audience-filter.util';
import { STATUS_BADGE } from '@/features/email/components/campaigns-view';
import { Button, buttonVariants } from '@/components/ui/button';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { LoadingState } from '@/components/ui/empty-state';
import { StatCard } from '@/components/ui/stat-card';

const backLinkCls =
  'inline-flex items-center gap-1.5 rounded-md text-sm text-muted-foreground transition-colors hover:text-foreground';

function InlineError({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="flex items-start gap-1.5 text-sm text-urgent-ink">
      <AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{children}</span>
    </p>
  );
}

const formatCount = (value: number | undefined) =>
  value != null ? value.toLocaleString('pt-BR') : '—';

export default function CampanhaDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const campaignQ = useCampaign(id);
  const campaign = campaignQ.data;
  usePageTitle(campaign?.name ?? 'Campanha de email');
  const isSending = campaign?.status === 'SENDING';

  const statsQ = useCampaignStats(id, isSending);
  const stats = statsQ.data;

  const qc = useQueryClient();

  const sendMutation = useSendCampaign(id);
  const audience = useCampaignAudience(campaign);
  const { confirm, confirmDialog } = useConfirm();

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
    return <LoadingState />;
  }

  if (campaignQ.isError || !campaign) {
    return (
      <div className="flex flex-col items-center gap-3 p-6">
        <InlineError>Não foi possível carregar esta campanha.</InlineError>
        <Link href="/email/campanhas" className={backLinkCls}>
          <ArrowLeft aria-hidden="true" className="h-3.5 w-3.5" />
          Voltar para Campanhas
        </Link>
      </div>
    );
  }

  const badge = STATUS_BADGE[campaign.status];
  const audienceCount = audience.countQ.data?.count;
  const sendsToEveryone = isAudienceFilterEmpty(audience.currentFilter);

  // Mesma regra de antes: sem a contagem do público não há disparo.
  const handleSend = async () => {
    if (audienceCount == null) return;
    const people = `${audienceCount.toLocaleString('pt-BR')} ${audienceCount === 1 ? 'pessoa' : 'pessoas'}`;
    const confirmed = await confirm({
      title: `Disparar para ${people}?`,
      description: (
        <>
          O email <strong className="font-medium text-foreground">{campaign.subject}</strong> será
          enviado para <strong className="font-medium text-foreground">{people}</strong> (
          {sendsToEveryone ? 'todos os inscritos ativos' : 'o público filtrado desta campanha'}). Não
          dá para desfazer depois de disparar.
        </>
      ),
      confirmLabel: `Disparar para ${people}`,
    });
    if (confirmed) sendMutation.mutate();
  };

  const progressPct =
    stats && stats.total > 0
      ? Math.round(((stats.total - stats.pending) / stats.total) * 100)
      : 0;

  return (
    <div className="mx-auto h-full min-h-0 w-full max-w-3xl space-y-6 overflow-y-auto p-4 sm:p-6">
      <Link href="/email/campanhas" className={backLinkCls}>
        <ArrowLeft aria-hidden="true" className="h-3.5 w-3.5" />
        Campanhas
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="break-words text-2xl font-bold tracking-tight text-foreground">
            {campaign.name}
          </h1>
          <p className="mt-1 break-words text-sm text-muted-foreground">{campaign.subject}</p>
        </div>
        <span className={`mt-1 shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${badge.className}`}>
          {badge.label}
        </span>
      </div>

      {campaign.status === 'DRAFT' && (
        <>
          <AudienceFilterPanel audience={audience} />

          <div className="space-y-3 rounded-xl border border-border bg-card p-4 shadow-soft">
            <div className="flex items-start gap-2 rounded-lg bg-warning-wash px-3 py-2 text-warning-ink">
              <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
              <p className="text-sm">
                {sendsToEveryone ? (
                  <>
                    Ao disparar, o email vai para <strong>todos os inscritos ativos</strong>
                  </>
                ) : (
                  <>
                    Ao disparar, o email vai só para quem casa com o{' '}
                    <strong>público filtrado acima</strong>
                  </>
                )}
                {audienceCount != null && (
                  <>
                    {' '}
                    (<strong className="font-mono tabular-nums">{audienceCount.toLocaleString('pt-BR')}</strong>{' '}
                    {audienceCount === 1 ? 'pessoa' : 'pessoas'})
                  </>
                )}
                . Essa ação <strong>não pode ser desfeita</strong> — revise o assunto e o conteúdo
                antes de confirmar.
              </p>
            </div>

            {sendMutation.isError && <InlineError>{extractErrorMessage(sendMutation.error)}</InlineError>}

            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/email/campanhas/${id}/editar`}
                className={buttonVariants({ variant: 'outline', size: 'lg' })}
              >
                <Pencil aria-hidden="true" className="h-4 w-4" />
                Editar conteúdo
              </Link>
              <Button
                size="lg"
                onClick={handleSend}
                disabled={audience.dirty || audienceCount == null}
                loading={sendMutation.isPending}
                title={audience.dirty ? 'Salve o filtro de público antes de disparar' : undefined}
              >
                {!sendMutation.isPending && <Send aria-hidden="true" className="h-4 w-4" />}
                {sendMutation.isPending ? 'Disparando…' : 'Disparar campanha'}
              </Button>
            </div>
            {audience.dirty && (
              <p className="text-xs text-muted-foreground">
                Salve o filtro de público acima para liberar o disparo.
              </p>
            )}
          </div>
        </>
      )}

      {campaign.status === 'SENDING' && (
        <div className="space-y-3 rounded-xl border border-border bg-card p-4 shadow-soft">
          <div className="flex items-center justify-between text-sm text-foreground">
            <span className="font-medium">Enviando…</span>
            <span className="font-mono font-medium tabular-nums">{progressPct}%</span>
          </div>
          <div
            role="progressbar"
            aria-label="Progresso do envio"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progressPct}
            className="h-2 w-full overflow-hidden rounded-full bg-muted"
          >
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          {resumeMutation.isError && <InlineError>{extractErrorMessage(resumeMutation.error)}</InlineError>}

          <Button size="lg" onClick={() => resumeMutation.mutate()} loading={resumeMutation.isPending}>
            {!resumeMutation.isPending && <RefreshCw aria-hidden="true" className="h-4 w-4" />}
            {resumeMutation.isPending ? 'Retomando…' : 'Retomar envio'}
          </Button>

          <p className="text-xs text-muted-foreground">
            Retomar é seguro: reenvia só quem ainda está pendente e nunca duplica um envio
            já feito.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard size="sm" label="Destinatários" value={formatCount(stats?.total)} />
        <StatCard size="sm" label="Entregues" value={formatCount(stats?.delivered)} />
        <StatCard size="sm" label="Aberturas" value={formatCount(stats?.opened)} />
        <StatCard size="sm" label="Cliques" value={formatCount(stats?.clicked)} />
        <StatCard size="sm" label="Pendentes" value={formatCount(stats?.pending)} />
        <StatCard size="sm" label="Inválidos" value={formatCount(stats?.bounced)} />
        <StatCard size="sm" label="Spam" value={formatCount(stats?.complained)} />
        <StatCard size="sm" label="Falhas" value={formatCount(stats?.failed)} />
      </div>

      {showFailures && (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-soft">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold text-foreground">
              Falhas de envio
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Motivo real devolvido pelo provedor de email para cada endereço.
            </p>
          </div>

          {failuresQ.isLoading && (
            <LoadingState label="Carregando falhas…" className="py-6" />
          )}
          {failuresQ.isError && (
            <div className="flex justify-center p-4">
              <InlineError>Não foi possível carregar as falhas.</InlineError>
            </div>
          )}
          {failuresQ.data && failuresQ.data.length > 0 && (
            <ul className="divide-y divide-border">
              {failuresQ.data.map((f, i) => (
                <li key={`${f.to}-${i}`} className="px-4 py-3">
                  <p className="break-all text-sm font-medium text-foreground">{f.to}</p>
                  <p className="mt-0.5 break-words text-xs text-urgent-ink">
                    {f.failedReason?.trim() || 'Motivo não informado pelo provedor.'}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {confirmDialog}
    </div>
  );
}
