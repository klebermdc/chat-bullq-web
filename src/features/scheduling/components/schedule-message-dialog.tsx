'use client';

import { useEffect, useState } from 'react';
import { X, Loader2, Clock, CalendarClock } from 'lucide-react';
import { useCreateScheduledMessage } from '../hooks/use-scheduled-messages';

interface Props {
  conversationId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Pré-preenche o texto (ex.: rascunho de reengajamento vindo do Painel). */
  initialText?: string;
  /** Data/hora sugerida ao abrir (ex.: +2h no reengajamento). Default: +1h. */
  initialScheduledAt?: Date;
}

/** Formata um Date para o value de um <input type="datetime-local"> (fuso local). */
function toLocalInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

function defaultWhen(base?: Date): Date {
  return base ?? new Date(Date.now() + 60 * 60 * 1000);
}

/**
 * Modal "Agendar mensagem": compõe um texto e escolhe data/hora futura.
 * O valor local do datetime-local é convertido para ISO UTC no submit
 * (`new Date(v).toISOString()`) — o backend valida se é futuro e devolve
 * a mensagem de erro que exibimos abaixo do campo.
 */
export function ScheduleMessageDialog({
  conversationId,
  open,
  onOpenChange,
  initialText,
  initialScheduledAt,
}: Props) {
  const [text, setText] = useState(initialText ?? '');
  const [when, setWhen] = useState(() =>
    toLocalInputValue(defaultWhen(initialScheduledAt)),
  );
  const [cancelOnReply, setCancelOnReply] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const create = useCreateScheduledMessage();

  // Reabrir sempre parte de um estado limpo (com o rascunho/hora sugeridos).
  useEffect(() => {
    if (open) {
      setText(initialText ?? '');
      setWhen(toLocalInputValue(defaultWhen(initialScheduledAt)));
      setCancelOnReply(true);
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // ESC fecha; trava o scroll do body enquanto aberto.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !create.isPending) onOpenChange(false);
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onOpenChange, create.isPending]);

  if (!open) return null;

  const trimmed = text.trim();
  const canSubmit = !!trimmed && !!when && !create.isPending;

  const handleSubmit = () => {
    if (!canSubmit) return;
    setError(null);
    let scheduledAt: string;
    try {
      scheduledAt = new Date(when).toISOString();
    } catch {
      setError('Data/hora inválida.');
      return;
    }
    create.mutate(
      {
        conversationId,
        type: 'TEXT',
        content: { text: trimmed },
        scheduledAt,
        cancelOnReply,
      },
      {
        onSuccess: () => onOpenChange(false),
        onError: (err: any) =>
          setError(
            err?.response?.data?.message ||
              err?.message ||
              'Não foi possível agendar a mensagem.',
          ),
      },
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={() => !create.isPending && onOpenChange(false)}
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950"
      >
        <div className="flex items-center justify-between gap-2 border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            <CalendarClock className="h-4 w-4 text-primary" />
            Agendar mensagem
          </h2>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={create.isPending}
            aria-label="Fechar"
            className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 disabled:opacity-50 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-4 py-4">
          <div>
            <label className="text-[12px] font-medium text-zinc-700 dark:text-zinc-300">
              Mensagem
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={create.isPending}
              rows={4}
              placeholder="Escreva a mensagem que será enviada…"
              className="mt-1.5 w-full resize-none rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm outline-none transition-colors placeholder:text-zinc-400 focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              autoFocus
            />
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-[12px] font-medium text-zinc-700 dark:text-zinc-300">
              <Clock className="h-3.5 w-3.5 text-zinc-400" />
              Enviar em
            </label>
            <input
              type="datetime-local"
              value={when}
              min={toLocalInputValue(new Date())}
              onChange={(e) => setWhen(e.target.value)}
              disabled={create.isPending}
              className="mt-1.5 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 [color-scheme:light] dark:[color-scheme:dark]"
            />
          </div>

          <label className="flex cursor-pointer items-start gap-2 text-[12px] text-zinc-700 dark:text-zinc-300">
            <input
              type="checkbox"
              checked={cancelOnReply}
              onChange={(e) => setCancelOnReply(e.target.checked)}
              disabled={create.isPending}
              className="mt-0.5 h-3.5 w-3.5 rounded border-zinc-300 text-primary focus:ring-primary dark:border-zinc-600"
            />
            <span>
              Cancelar automaticamente se o cliente responder antes
            </span>
          </label>

          {error && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-zinc-100 bg-zinc-50/50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900/50">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={create.isPending}
            className="rounded-md px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-100 disabled:opacity-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {create.isPending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Clock className="h-3 w-3" />
            )}
            Agendar
          </button>
        </div>
      </div>
    </div>
  );
}
