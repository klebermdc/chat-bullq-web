'use client';

import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { controlCls } from '@/components/ui/control';
import { useCreateScheduledMessage } from '../hooks/use-scheduled-messages';
import { getErrorMessage } from '@/lib/errors';

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
            getErrorMessage(err, 'Não foi possível agendar a mensagem.'),
          ),
      },
    );
  };

  // Não fecha no meio do envio (igual ao modal antigo).
  const close = () => {
    if (!create.isPending) onOpenChange(false);
  };
  // Esc/clique fora só fecham enquanto nada foi escrito além do rascunho que
  // veio do compositor — depois disso fechar sem querer perderia o texto.
  const isUntouched = trimmed === (initialText ?? '').trim();

  return (
    <Dialog
      open={open}
      onClose={close}
      title="Agendar mensagem"
      description="A mensagem sai sozinha na data e hora escolhidas."
      dismissible={isUntouched}
      footer={
        <>
          <Button type="button" variant="outline" onClick={close} disabled={create.isPending}>
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!trimmed || !when}
            loading={create.isPending}
          >
            {!create.isPending && <Clock aria-hidden="true" className="h-4 w-4" />}
            Agendar
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label htmlFor="schedule-text" className="block text-sm font-medium text-foreground">
            Mensagem
          </label>
          <textarea
            id="schedule-text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={create.isPending}
            rows={4}
            placeholder="Escreva a mensagem que será enviada…"
            className={`${controlCls} mt-1.5 h-auto w-full resize-none py-2`}
            autoFocus
          />
        </div>

        <div>
          <label htmlFor="schedule-when" className="block text-sm font-medium text-foreground">
            Enviar em
          </label>
          <input
            id="schedule-when"
            type="datetime-local"
            value={when}
            min={toLocalInputValue(new Date())}
            onChange={(e) => setWhen(e.target.value)}
            disabled={create.isPending}
            className={`${controlCls} mt-1.5 w-full font-mono tabular-nums [color-scheme:light] dark:[color-scheme:dark]`}
          />
        </div>

        <label className="flex min-h-10 cursor-pointer items-center gap-2.5 text-sm text-foreground">
          <input
            type="checkbox"
            checked={cancelOnReply}
            onChange={(e) => setCancelOnReply(e.target.checked)}
            disabled={create.isPending}
            className="h-4 w-4 shrink-0 rounded border-input text-primary focus:ring-ring"
          />
          <span>Cancelar automaticamente se o cliente responder antes</span>
        </label>

        {error && (
          <p role="alert" className="rounded-lg bg-urgent-wash px-3 py-2 text-xs text-urgent-ink">
            {error}
          </p>
        )}
      </div>
    </Dialog>
  );
}
