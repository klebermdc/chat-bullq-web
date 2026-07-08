'use client';

import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import { Clock, Trash2, Loader2, Bot, User } from 'lucide-react';
import { toast } from 'sonner';
import {
  useScheduledMessages,
  useCancelScheduledMessage,
} from '../hooks/use-scheduled-messages';
import type { ScheduledMessage } from '../types';

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
        toast.error(err?.response?.data?.message || 'Erro ao cancelar'),
    });
  };

  return (
    <Popover className="relative">
      <PopoverButton
        title={`${pending.length} ${pending.length === 1 ? 'mensagem agendada' : 'mensagens agendadas'}`}
        className="inline-flex h-8 items-center gap-1 rounded-md bg-primary/10 px-2 text-xs font-semibold text-primary hover:bg-primary/15"
      >
        <Clock className="h-3.5 w-3.5" />
        {pending.length}
      </PopoverButton>

      <PopoverPanel
        anchor="bottom end"
        transition
        className="z-50 mt-1.5 w-80 rounded-lg border border-zinc-200 bg-white p-1 shadow-lg outline-none transition duration-100 ease-out data-[closed]:scale-95 data-[closed]:opacity-0 dark:border-zinc-800 dark:bg-zinc-900 [--anchor-gap:0.25rem]"
      >
        <div className="px-2 py-1.5 text-[11px] font-bold uppercase tracking-wide text-zinc-400">
          Agendamentos
        </div>
        <div className="max-h-80 overflow-y-auto">
          {pending.map((m) => {
            const auto = m.origin === 'AUTO_REENGAGE';
            return (
              <div
                key={m.id}
                className="flex items-start gap-2 rounded-md px-2 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs text-zinc-900 dark:text-zinc-100">
                    {previewOf(m)}
                  </p>
                  <div className="mt-1 flex items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 text-[10px] text-zinc-500">
                      <Clock className="h-3 w-3" />
                      {formatWhen(m.scheduledAt)}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${
                        auto
                          ? 'bg-sky-500/15 text-sky-600 dark:text-sky-400'
                          : 'bg-zinc-500/15 text-zinc-500 dark:text-zinc-400'
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
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-zinc-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-50 dark:hover:bg-red-900/20"
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
