'use client';

import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { X, Loader2, Trophy } from 'lucide-react';
import { toast } from 'sonner';
import { pipelinesService } from '../services/pipelines.service';

interface Props {
  conversationId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Modal "Ganho" (E5.1 — Fechamento): o atendente informa o nº do pedido e o
 * card é marcado como Ganho (movido pra etapa WON). O nº do pedido é a chave de
 * correlação futura com o HUB (E5.2). Segue o padrão de modal manual do
 * ProposalDialog (o projeto não usa lib de Dialog).
 */
export function WonDialog({ conversationId, open, onOpenChange }: Props) {
  const queryClient = useQueryClient();
  const [orderNumber, setOrderNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reabrir sempre parte de estado limpo.
  useEffect(() => {
    if (open) {
      setOrderNumber('');
      setError(null);
      setLoading(false);
    }
  }, [open]);

  // ESC fecha; trava o scroll do body enquanto aberto.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) onOpenChange(false);
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onOpenChange, loading]);

  if (!open) return null;

  async function handleSubmit() {
    if (loading) return;
    setError(null);
    setLoading(true);
    try {
      await pipelinesService.markWon(conversationId, orderNumber.trim() || undefined);
      queryClient.invalidateQueries({ queryKey: ['pipelines'] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      toast.success('Negócio marcado como Ganho! 🏆');
      onOpenChange(false);
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setError(
        (Array.isArray(msg) ? msg[0] : msg) ||
          err?.message ||
          'Não consegui marcar como Ganho. Tenta de novo.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={() => !loading && onOpenChange(false)}
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950"
      >
        <div className="flex items-center justify-between gap-2 border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            <Trophy className="h-4 w-4 text-amber-500" />
            Marcar como Ganho
          </h2>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            aria-label="Fechar"
            className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 disabled:opacity-50 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-4 py-4">
          <div>
            <label className="text-[12px] font-medium text-zinc-700 dark:text-zinc-300">
              Número do pedido
            </label>
            <input
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !loading) handleSubmit();
              }}
              disabled={loading}
              placeholder="Ex.: 12345"
              className="mt-1.5 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm outline-none transition-colors placeholder:text-zinc-400 focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              autoFocus
            />
            <p className="mt-1 text-[11px] text-zinc-400">
              É a chave que liga esse card ao pedido no HUB (relatórios e
              correlação). Se ainda não tiver, pode deixar em branco e preencher
              depois.
            </p>
          </div>

          {error && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-zinc-100 px-4 py-3 dark:border-zinc-800">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="rounded-md px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-100 disabled:opacity-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-md bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
          >
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Marcar Ganho
          </button>
        </div>
      </div>
    </div>
  );
}
