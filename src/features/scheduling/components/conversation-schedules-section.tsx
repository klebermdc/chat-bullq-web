'use client';

import { useState } from 'react';
import { CalendarClock, Plus, X, Bot, User, Loader2 } from 'lucide-react';
import {
  useScheduledMessages,
  useCancelScheduledMessage,
} from '../hooks/use-scheduled-messages';
import { ScheduleMessageDialog } from './schedule-message-dialog';

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

  const pending = (data ?? [])
    .filter((m) => m.status === 'PENDING')
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));

  return (
    <div className="mt-5">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
          Mensagens agendadas
        </p>
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary transition-colors hover:bg-primary/20"
        >
          <Plus className="h-3 w-3" /> Agendar
        </button>
      </div>

      {isLoading ? (
        <p className="py-1 text-sm text-muted-foreground">…</p>
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
                className="group relative rounded-lg border border-border/60 bg-muted/30 p-2 pr-6"
              >
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-primary">
                  <CalendarClock className="h-3.5 w-3.5 shrink-0" />
                  {formatWhen(m.scheduledAt)}
                  <span
                    title={
                      isAuto ? 'Reengajamento automático' : 'Agendamento manual'
                    }
                    className="ml-auto inline-flex items-center gap-0.5 text-[10px] font-normal text-muted-foreground"
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
                <p className="mt-1 line-clamp-2 text-[12px] text-foreground/80">
                  {text}
                </p>
                <button
                  onClick={() => cancel.mutate(m.id)}
                  disabled={cancel.isPending}
                  title="Cancelar agendamento"
                  className="absolute right-1.5 top-1.5 rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-red-500 group-hover:opacity-100 disabled:opacity-50"
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
      />
    </div>
  );
}
