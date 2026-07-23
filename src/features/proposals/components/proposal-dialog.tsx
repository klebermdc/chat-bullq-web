'use client';

import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { X, Loader2, ShoppingCart } from 'lucide-react';
import { proposalsService } from '../services/proposals.service';
import type { ProposalMode } from '../types';

interface Props {
  conversationId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Modal "Enviar proposta do carrinho": cola o link do checkout e dispara a
 * geração da proposta. Segue o mesmo padrão visual do ScheduleMessageDialog
 * (modal manual, sem lib de Dialog no projeto).
 */
export function ProposalDialog({ conversationId, open, onOpenChange }: Props) {
  const queryClient = useQueryClient();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<ProposalMode>('NEW');
  const [modeTouched, setModeTouched] = useState(false);

  // Propostas já existentes deste contato — decide o padrão do seletor.
  const { data: existing } = useQuery({
    queryKey: ['proposals', 'conversation', conversationId],
    queryFn: () => proposalsService.listForConversation(conversationId),
    enabled: open,
  });

  // Reabrir sempre parte de um estado limpo.
  useEffect(() => {
    if (open) {
      setUrl('');
      setError(null);
      setLoading(false);
      setModeTouched(false);
    }
  }, [open]);

  // Padrão inteligente: se já existe proposta, sugere "Atualização" (a menos
  // que o atendente já tenha escolhido manualmente).
  useEffect(() => {
    if (open && !modeTouched && existing !== undefined) {
      setMode(existing.length > 0 ? 'UPDATE' : 'NEW');
    }
  }, [open, modeTouched, existing]);

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

  const trimmed = url.trim();
  const canSubmit = !!trimmed && !loading;

  async function handleSubmit() {
    if (!canSubmit) return;
    setError(null);
    setLoading(true);
    try {
      await proposalsService.create({ conversationId, checkoutUrl: trimmed, mode });
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      setUrl('');
      onOpenChange(false);
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setError(
        (Array.isArray(msg) ? msg[0] : msg) ||
          err?.message ||
          'Não consegui ler o carrinho. Confere o link e tenta de novo.',
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
            <ShoppingCart className="h-4 w-4 text-primary" />
            Enviar proposta do carrinho
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
              Tipo
            </label>
            <div className="mt-1.5 grid grid-cols-2 gap-1 rounded-md bg-zinc-100 p-1 dark:bg-zinc-800">
              {([
                { v: 'NEW', label: 'Nova proposta' },
                { v: 'UPDATE', label: 'Atualização' },
              ] as { v: ProposalMode; label: string }[]).map((opt) => (
                <button
                  key={opt.v}
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    setMode(opt.v);
                    setModeTouched(true);
                  }}
                  className={
                    'rounded px-2 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ' +
                    (mode === opt.v
                      ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-950 dark:text-zinc-100'
                      : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200')
                  }
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <p className="mt-1 text-[11px] text-zinc-400">
              {mode === 'UPDATE'
                ? 'Envia uma mensagem curta ("Ajustei sua proposta…"), sem a saudação completa.'
                : 'Envia a mensagem completa de boas-vindas com a proposta.'}
            </p>
          </div>

          <div>
            <label className="text-[12px] font-medium text-zinc-700 dark:text-zinc-300">
              Link do checkout
            </label>
            <textarea
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={loading}
              rows={4}
              placeholder={
                'Cole o link do checkout (pode colar junto com o resumo do carrinho)\n\nEx.: https://reservas.orlandofastpass.com.br/pt/checkout/...'
              }
              className="mt-1.5 w-full resize-y rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm outline-none transition-colors placeholder:text-zinc-400 focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              autoFocus
            />
            <p className="mt-1 text-[11px] text-zinc-400">
              Pode colar o bloco inteiro do carrinho — eu pego o link e os dados automaticamente.
            </p>
          </div>

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
            disabled={loading}
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
            {loading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <ShoppingCart className="h-3 w-3" />
            )}
            Gerar proposta
          </button>
        </div>
      </div>
    </div>
  );
}
