'use client';

import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ThumbsDown } from 'lucide-react';
import { toast } from 'sonner';
import { pipelinesService } from '../services/pipelines.service';
import {
  LOST_NOTE_MAX_LENGTH,
  LOST_REASONS,
  isNoteRequired,
  type LostReasonCode,
} from '../lib/lost-reasons';
import { getErrorMessage } from '@/lib/errors';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface Props {
  conversationId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Quanto tempo o aviso fica na tela com o "Desfazer". */
const UNDO_TOAST_MS = 8000;

const NOTE_CLS =
  'mt-1.5 w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm ' +
  'text-foreground shadow-soft outline-none transition-colors placeholder:text-muted-foreground ' +
  'focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25 disabled:opacity-50';

/**
 * Modal "Venda perdida": o vendedor escolhe o motivo (teclas 1–6 também
 * servem), pode deixar uma observação, e a conversa é encerrada. O aviso de
 * sucesso traz "Desfazer" para o clique errado.
 */
export function LostDialog({ conversationId, open, onOpenChange }: Props) {
  const queryClient = useQueryClient();
  const [reason, setReason] = useState<LostReasonCode | null>(null);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const noteRef = useRef<HTMLTextAreaElement>(null);
  const keyHandlerRef = useRef<(e: KeyboardEvent) => void>(() => {});

  // Reabrir sempre parte de estado limpo.
  useEffect(() => {
    if (open) {
      setReason(null);
      setNote('');
      setError(null);
      setLoading(false);
    }
  }, [open]);

  // No window: o foco inicial do Dialog cai no X, fora do conteúdo.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => keyHandlerRef.current(e);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (!open) return null;

  const selected = LOST_REASONS.find((r) => r.code === reason) ?? null;
  const noteRequired = isNoteRequired(reason);
  const canSubmit = !!reason && (!noteRequired || note.trim().length > 0);

  const handleClose = () => {
    if (!loading) onOpenChange(false);
  };

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['pipelines'] });
    queryClient.invalidateQueries({ queryKey: ['pipeline-board'] });
    queryClient.invalidateQueries({ queryKey: ['conversations'] });
    queryClient.invalidateQueries({ queryKey: ['conversation', conversationId] });
    queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
    queryClient.invalidateQueries({ queryKey: ['conversation-tab-counts'] });
  };

  const pick = (code: LostReasonCode) => {
    setReason(code);
    setError(null);
    if (isNoteRequired(code)) requestAnimationFrame(() => noteRef.current?.focus());
  };

  async function undo() {
    try {
      await pipelinesService.undoLost(conversationId);
      refresh();
      toast.success('Venda perdida desfeita');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Não consegui desfazer. Reabra a conversa pelo cabeçalho.'));
    }
  }

  async function handleSubmit() {
    if (loading || !reason || !canSubmit) return;
    setError(null);
    setLoading(true);
    try {
      await pipelinesService.markLost(conversationId, reason, note.trim() || undefined);
      refresh();
      toast.success(`Venda perdida: ${selected?.label}`, {
        duration: UNDO_TOAST_MS,
        action: { label: 'Desfazer', onClick: undo },
      });
      onOpenChange(false);
    } catch (err) {
      setError(getErrorMessage(err, 'Não consegui registrar a venda perdida. Tente de novo.'));
    } finally {
      setLoading(false);
    }
  }

  // 1–6 escolhe o motivo; Ctrl/⌘+Enter confirma. Dentro da observação,
  // número é texto.
  keyHandlerRef.current = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
      return;
    }
    const inNote = e.target === noteRef.current;
    if (inNote || loading || e.metaKey || e.ctrlKey || e.altKey) return;
    const index = Number(e.key) - 1;
    const option = LOST_REASONS[index];
    if (option) {
      e.preventDefault();
      pick(option.code);
    }
  };

  return (
    <Dialog
      open
      onClose={handleClose}
      size="md"
      title={
        <span className="flex items-center gap-2">
          <ThumbsDown aria-hidden="true" className="h-4 w-4 shrink-0 text-urgent-ink" />
          Venda perdida
        </span>
      }
      description="Por que não fechou? A conversa será encerrada."
      footer={
        <>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            loading={loading}
            disabled={!canSubmit}
          >
            Encerrar como perdida
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div
          role="radiogroup"
          aria-label="Motivo da venda perdida"
          className="grid gap-1.5 sm:grid-cols-2"
        >
          {LOST_REASONS.map((option, index) => {
            const isActive = option.code === reason;
            return (
              <button
                key={option.code}
                type="button"
                role="radio"
                aria-checked={isActive}
                onClick={() => pick(option.code)}
                disabled={loading}
                className={`flex min-h-11 items-center gap-2.5 rounded-xl border px-3 py-2 text-left text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  isActive
                    ? 'border-urgent-ink bg-urgent-wash text-urgent-ink'
                    : 'border-input bg-background text-foreground hover:bg-muted'
                }`}
              >
                <kbd
                  aria-hidden="true"
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded border border-current/30 text-[11px] font-semibold tabular-nums opacity-70"
                >
                  {index + 1}
                </kbd>
                {option.label}
              </button>
            );
          })}
        </div>

        {selected && (
          <div>
            <label htmlFor="lost-note" className="block text-sm font-medium text-foreground">
              Observação {noteRequired ? '' : <span className="text-muted-foreground">(opcional)</span>}
            </label>
            <textarea
              id="lost-note"
              ref={noteRef}
              rows={2}
              value={note}
              maxLength={LOST_NOTE_MAX_LENGTH}
              onChange={(e) => setNote(e.target.value)}
              disabled={loading}
              placeholder={selected.hint}
              className={NOTE_CLS}
            />
          </div>
        )}

        {error && (
          <p role="alert" className="rounded-lg bg-urgent-wash px-3 py-2 text-xs text-urgent-ink">
            {error}
          </p>
        )}
      </div>
    </Dialog>
  );
}
