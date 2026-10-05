'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Clock, Send, X, HeartHandshake, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { useReengageSuggestion, useInactivitySettings } from '../hooks/use-inactivity';
import { useCreateScheduledMessage } from '../hooks/use-scheduled-messages';
import { schedulingService } from '../services/scheduling.service';
import { ScheduleMessageDialog } from './schedule-message-dialog';
import { getErrorMessage } from '@/lib/errors';

interface Props {
  conversationId: string;
}

/**
 * Card discreto de reengajamento no Painel Inteligente. Aparece só quando a
 * conversa está elegível (cliente inativo). Mostra a faixa de inatividade, um
 * rascunho gerado por IA e três ações: agendar (abre o modal), enviar agora
 * (agenda pra ~1min, reusando o pipeline de envio) ou descartar a sugestão.
 */
export function ReengageSuggestionCard({ conversationId }: Props) {
  const { data, isLoading } = useReengageSuggestion(conversationId);
  const { data: settings } = useInactivitySettings();
  const qc = useQueryClient();
  const create = useCreateScheduledMessage();
  const [dialogOpen, setDialogOpen] = useState(false);

  const dismiss = useMutation({
    mutationFn: () => schedulingService.dismissSuggestion(conversationId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reengage-suggestion', conversationId] });
    },
    onError: (err: any) =>
      toast.error(getErrorMessage(err, 'Erro ao descartar')),
  });

  // Enquanto carrega mostramos um esqueleto discreto; se não for elegível não
  // renderizamos nada (não polui o painel de conversas ativas).
  if (isLoading) {
    return (
      <div className="mt-4 rounded-xl border border-warning/30 bg-warning-wash p-3">
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="mt-2 h-4 w-full" />
        <Skeleton className="mt-1 h-4 w-2/3" />
      </div>
    );
  }
  if (!data?.eligible) return null;

  const draft = data.draft;
  const bands = settings?.bandsDays;
  const units = settings?.bandsUnits;
  const bandValue =
    data.band != null && bands && bands[data.band] != null
      ? bands[data.band]
      : null;
  const bandWord =
    (units?.[data.band ?? -1] ?? 'DAYS') === 'HOURS' ? 'horas' : 'dias';
  const bandLabel =
    bandValue != null
      ? `Sem resposta há ${bandValue}+ ${bandWord}`
      : 'Cliente inativo';

  const sendNow = () => {
    if (!draft) return;
    const scheduledAt = new Date(Date.now() + 60_000).toISOString();
    create.mutate(
      {
        conversationId,
        type: 'TEXT',
        content: { text: draft },
        scheduledAt,
        cancelOnReply: true,
      },
      {
        onSuccess: () => {
          toast.success('Mensagem será enviada em instantes');
          qc.invalidateQueries({
            queryKey: ['reengage-suggestion', conversationId],
          });
        },
        onError: (err: any) =>
          toast.error(getErrorMessage(err, 'Erro ao enviar')),
      },
    );
  };

  const busy = create.isPending || dismiss.isPending;

  return (
    <div className="mt-4 rounded-xl border border-warning/30 bg-warning-wash p-3">
      <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-warning-ink">
        <HeartHandshake className="h-3.5 w-3.5" />
        Reengajar
      </div>
      <p className="mt-1 text-[11px] font-medium text-warning-ink">
        {bandLabel}
      </p>

      {draft ? (
        <p className="mt-2 rounded-lg bg-card/60 p-2 text-sm text-foreground ring-1 ring-border">
          {draft}
        </p>
      ) : (
        <p className="mt-2 text-xs text-muted-foreground">
          Não foi possível gerar um rascunho automático — você pode escrever a
          mensagem ao agendar.
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => setDialogOpen(true)}
          disabled={busy}
          className="inline-flex h-8 items-center gap-1 rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          <Clock className="h-3.5 w-3.5" />
          Agendar
        </button>
        <button
          type="button"
          onClick={sendNow}
          disabled={busy || !draft}
          title={!draft ? 'Sem rascunho para enviar' : 'Enviar agora'}
          className="inline-flex h-8 items-center gap-1 rounded-lg border border-border bg-background px-3 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-50"
        >
          {create.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Send className="h-3.5 w-3.5" />
          )}
          Enviar agora
        </button>
        <button
          type="button"
          onClick={() => dismiss.mutate()}
          disabled={busy}
          className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-medium text-muted-foreground hover:bg-card/60 hover:text-foreground disabled:opacity-50"
        >
          {dismiss.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <X className="h-3.5 w-3.5" />
          )}
          Descartar
        </button>
      </div>

      <ScheduleMessageDialog
        conversationId={conversationId}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initialText={draft ?? undefined}
        initialScheduledAt={new Date(Date.now() + 2 * 60 * 60 * 1000)}
      />
    </div>
  );
}
