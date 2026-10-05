'use client';

import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import { Clock, Trash2, Loader2, Bot, User } from 'lucide-react';
import { toast } from 'sonner';
import {
  useScheduledMessages,
  useCancelScheduledMessage,
} from '../hooks/use-scheduled-messages';
import type { ScheduledMessage } from '../types';
import { getErrorMessage } from '@/lib/errors';

interface Props {
  conversationId: string;
}

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function previewOf(m: ScheduledMessage): string {
  const text = m.content?.text;
  if (typeof text === 'string' && text.trim()) return text;
  return m.contentType || 'Mensagem';
}

/**
 * Indicador "⏰ N" + popover de gerência dos agendamentos PENDENTES da
 * conversa. Auto-oculta (renderiza `null`) quando não há nenhum pendente,
 * então o header pode montá-lo incondicionalmente. Reusa o primitivo de
 * Popover do headless-ui (mesmo de assignment-popover / agent-pin-popover).
 */
export function ScheduledMessagesPopover({ conversationId }: Props) {
  const { data } = useScheduledMessages(conversationId);
  const cancel = useCancelScheduledMessage(conversationId);

  const pending = (data ?? []).filter((m) => m.status === 'PENDING');
  if (pending.length === 0) return null;

  const handleCancel = (id: string) => {
    cancel.mutate(id, {
      onSuccess: () => toast.success('Agendamento cancelado'),
      onError: (err: any) =>
        toast.error(getErrorMessage(err, 'Erro ao cancelar')),
    });
  };

  return (
    <Popover className="relative">
      <PopoverButton
        title={`${pending.length} ${pending.length === 1 ? 'mensagem agendada' : 'mensagens agendadas'}`}
        aria-label={`${pending.length} ${pending.length === 1 ? 'mensagem agendada' : 'mensagens agendadas'}`}
        className="inline-flex h-8 items-center gap-1 rounded-lg bg-primary/10 px-2 font-mono text-xs font-semibold tabular-nums text-primary hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Clock aria-hidden="true" className="h-3.5 w-3.5" />
        {pending.length}
      </PopoverButton>

      <PopoverPanel
        anchor="bottom end"
        transition
        className="z-50 mt-1.5 w-80 rounded-xl border border-border bg-popover p-1 shadow-elevated outline-none transition duration-100 ease-out data-[closed]:scale-95 data-[closed]:opacity-0 [--anchor-gap:0.25rem]"
      >
        <div className="px-2 py-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
          Agendamentos
        </div>
        <div className="max-h-80 overflow-y-auto">
          {pending.map((m) => {
            const auto = m.origin === 'AUTO_REENGAGE';
            return (
              <div
                key={m.id}
                className="flex items-start gap-2 rounded-md px-2 py-2 hover:bg-muted/50"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs text-foreground">
                    {previewOf(m)}
                  </p>
                  <div className="mt-1 flex items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 font-mono text-[11px] tabular-nums text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatWhen(m.scheduledAt)}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
                        auto ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {auto ? (
                        <Bot className="h-2.5 w-2.5" />
                      ) : (
                        <User className="h-2.5 w-2.5" />
                      )}
                      {auto ? 'Auto' : 'Manual'}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleCancel(m.id)}
                  disabled={cancel.isPending}
                  aria-label="Cancelar agendamento"
                  title="Cancelar agendamento"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-urgent-wash hover:text-urgent-ink disabled:opacity-50"
                >
                  {cancel.isPending && cancel.variables === m.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </PopoverPanel>
    </Popover>
  );
}
