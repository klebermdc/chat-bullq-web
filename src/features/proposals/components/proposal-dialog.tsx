'use client';

import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { controlCls } from '@/components/ui/control';
import { proposalsService } from '../services/proposals.service';
import type { ProposalMode } from '../types';
import { getErrorMessage } from '@/lib/errors';

interface Props {
  conversationId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Modal "Enviar proposta do carrinho": cola o link do checkout e dispara a
 * geração da proposta. Usa o `<Dialog>` padrão (foco preso, Esc, rolagem travada).
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

  const trimmed = url.trim();
  const canSubmit = !!trimmed && !loading;

  async function handleSubmit() {
    if (!canSubmit) return;
    setError(null);
    setLoading(true);
    try {
      await proposalsService.create({ conversationId, checkoutUrl: trimmed, mode });
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      // A proposta move o card para PROPOSTA ENVIADA no funil.
      queryClient.invalidateQueries({ queryKey: ['pipeline-board'] });
      setUrl('');
      onOpenChange(false);
    } catch (err: any) {
      setError(getErrorMessage(err, 'Não consegui ler o carrinho. Confere o link e tenta de novo.'));
    } finally {
      setLoading(false);
    }
  }

  // Não fecha no meio da geração (igual ao modal antigo).
  const close = () => {
    if (!loading) onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onClose={close}
      title="Enviar proposta do carrinho"
      // Com o link já colado, Esc/clique fora não fecham sem querer.
      dismissible={!trimmed}
      footer={
        <>
          <Button type="button" variant="outline" onClick={close} disabled={loading}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={!trimmed} loading={loading}>
            {!loading && <ShoppingCart aria-hidden="true" className="h-4 w-4" />}
            Gerar proposta
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <p id="proposal-mode-label" className="text-sm font-medium text-foreground">
            Tipo
          </p>
          <div
            role="group"
            aria-labelledby="proposal-mode-label"
            className="mt-1.5 grid grid-cols-2 gap-1 rounded-lg bg-muted p-1"
          >
            {([
              { v: 'NEW', label: 'Nova proposta' },
              { v: 'UPDATE', label: 'Atualização' },
            ] as { v: ProposalMode; label: string }[]).map((opt) => (
              <button
                key={opt.v}
                type="button"
                disabled={loading}
                aria-pressed={mode === opt.v}
                onClick={() => {
                  setMode(opt.v);
                  setModeTouched(true);
                }}
                className={
                  'h-8 rounded-md px-2 text-xs font-medium transition-colors disabled:opacity-50 ' +
                  (mode === opt.v
                    ? 'bg-card text-foreground shadow-soft'
                    : 'text-muted-foreground hover:text-foreground')
                }
              >
                {opt.label}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">
            {mode === 'UPDATE'
              ? 'Envia uma mensagem curta ("Ajustei sua proposta…"), sem a saudação completa.'
              : 'Envia a mensagem completa de boas-vindas com a proposta.'}
          </p>
        </div>

        <div>
          <label htmlFor="proposal-url" className="block text-sm font-medium text-foreground">
            Link do checkout
          </label>
          <textarea
            id="proposal-url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={loading}
            rows={4}
            placeholder={
              'Cole o link do checkout (pode colar junto com o resumo do carrinho)\n\nEx.: https://reservas.orlandofastpass.com.br/pt/checkout/...'
            }
            className={`${controlCls} mt-1.5 h-auto w-full resize-y py-2`}
            autoFocus
          />
          <p className="mt-1.5 text-xs text-muted-foreground">
            Pode colar o bloco inteiro do carrinho — eu pego o link e os dados automaticamente.
          </p>
        </div>

        {error && (
          <p role="alert" className="rounded-lg bg-urgent-wash px-3 py-2 text-xs text-urgent-ink">
            {error}
          </p>
        )}
      </div>
    </Dialog>
  );
}
