'use client';

import { useState } from 'react';
import { CalendarClock, Plus, X, Bot, User, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import {
  useScheduledMessages,
  useCancelScheduledMessage,
} from '../hooks/use-scheduled-messages';
import { schedulingService } from '../services/scheduling.service';
import { ScheduleMessageDialog } from './schedule-message-dialog';
import { Button } from '@/components/ui/button';

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Seção "Mensagens agendadas" do Painel Inteligente: botão de agendar +
 * cronograma dos agendamentos PENDING da conversa (data/hora, preview,
 * origem manual/auto e cancelar).
 */
export function ConversationSchedulesSection({
  conversationId,
}: {
  conversationId: string;
}) {
  const { data, isLoading } = useScheduledMessages(conversationId);
  const cancel = useCancelScheduledMessage(conversationId);
  const [open, setOpen] = useState(false);
  const [initialText, setInitialText] = useState<string | undefined>(undefined);
  const [drafting, setDrafting] = useState(false);

  const openBlank = () => {
    setInitialText(undefined);
    setOpen(true);
  };

  const suggestWithAi = async () => {
    setDrafting(true);
    try {
      const draft = await schedulingService.messageDraft(conversationId);
      if (!draft) {
        toast.error('Não foi possível gerar um rascunho agora.');
        return;
      }
      setInitialText(draft);
      setOpen(true);
    } catch {
      toast.error('Erro ao gerar rascunho com IA.');
    } finally {
      setDrafting(false);
    }
  };

  const pending = (data ?? [])
    .filter((m) => m.status === 'PENDING')
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));

  return (
    <div className="mt-5">
      {/* Uma linha: rótulo à esquerda (sem quebrar), os dois botões à direita.
          Sem espaço, o GRUPO de botões desce inteiro para baixo do rótulo. */}
      <div className="mb-2 flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5">
        <h3 className="whitespace-nowrap text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Mensagens agendadas
        </h3>
        <div className="flex shrink-0 items-center gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={suggestWithAi}
            loading={drafting}
            title="Gerar um rascunho de mensagem com IA e agendar"
            className="gap-1.5 px-2.5"
          >
            {!drafting && <Sparkles aria-hidden="true" className="h-3.5 w-3.5" />}
            Sugerir com IA
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={openBlank}
            className="gap-1.5 px-2.5"
          >
            <Plus aria-hidden="true" className="h-3.5 w-3.5" /> Agendar
          </Button>
        </div>
      </div>

      {isLoading ? (
        <p role="status" className="py-1 text-sm text-muted-foreground">Carregando…</p>
      ) : pending.length === 0 ? (
        <p className="py-1 text-sm text-muted-foreground">
          Nenhuma mensagem agendada.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {pending.map((m) => {
            const raw = (m.content ?? {}) as Record<string, unknown>;
            const text =
              typeof raw.text === 'string'
                ? raw.text
                : `[${m.contentType.toLowerCase()}]`;
            const isAuto = m.origin === 'AUTO_REENGAGE';
            return (
              <li
                key={m.id}
                className="group relative rounded-lg border border-border bg-muted/40 p-2 pr-9"
              >
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-foreground">
                  <CalendarClock aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="font-mono tabular-nums">{formatWhen(m.scheduledAt)}</span>
                  <span
                    title={
                      isAuto ? 'Reengajamento automático' : 'Agendamento manual'
                    }
                    className="ml-auto inline-flex items-center gap-0.5 text-[11px] font-normal text-muted-foreground"
                  >
                    {isAuto ? (
                      <>
                        <Bot className="h-3 w-3" /> auto
                      </>
                    ) : (
                      <>
                        <User className="h-3 w-3" /> manual
                      </>
                    )}
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-foreground/80">
                  {text}
                </p>
                <button
                  onClick={() => cancel.mutate(m.id)}
                  disabled={cancel.isPending}
                  type="button"
                  title="Cancelar agendamento"
                  aria-label="Cancelar agendamento"
                  className="absolute right-0.5 top-0.5 flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground opacity-0 transition-opacity hover:bg-urgent-wash hover:text-urgent-ink focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring group-hover:opacity-100 disabled:opacity-50 [@media(hover:none)]:opacity-100"
                >
                  {cancel.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <X className="h-3.5 w-3.5" />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <ScheduleMessageDialog
        conversationId={conversationId}
        open={open}
        onOpenChange={setOpen}
        initialText={initialText}
      />
    </div>
  );
}
