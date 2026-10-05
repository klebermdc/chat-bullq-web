'use client';

import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Trophy } from 'lucide-react';
import { toast } from 'sonner';
import { pipelinesService } from '../services/pipelines.service';
import { getErrorMessage } from '@/lib/errors';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { controlCls } from '@/components/ui/control';

interface Props {
  conversationId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Modal "Ganho" (E5.1 — Fechamento): o atendente informa o nº do pedido e o
 * card é marcado como Ganho (movido pra etapa WON). O nº do pedido é a chave de
 * correlação futura com o HUB (E5.2).
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

  if (!open) return null;

  // Enquanto salva, o diálogo não fecha (Esc, clique fora, X ou Cancelar).
  const handleClose = () => {
    if (!loading) onOpenChange(false);
  };

  async function handleSubmit() {
    if (loading) return;
    setError(null);
    setLoading(true);
    try {
      await pipelinesService.markWon(conversationId, orderNumber.trim() || undefined);
      queryClient.invalidateQueries({ queryKey: ['pipelines'] });
      queryClient.invalidateQueries({ queryKey: ['pipeline-board'] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      toast.success('Negócio marcado como ganho!');
      onOpenChange(false);
    } catch (err: any) {
      setError(getErrorMessage(err, 'Não consegui marcar como ganho. Tente de novo.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog
      open
      onClose={handleClose}
      size="md"
      title={
        <span className="flex items-center gap-2">
          <Trophy aria-hidden="true" className="h-4 w-4 shrink-0 text-warning-ink" />
          Marcar como ganho
        </span>
      }
      footer={
        <>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} loading={loading}>
            Marcar como ganho
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label
            htmlFor="won-order-number"
            className="block text-sm font-medium text-foreground"
          >
            Número do pedido
          </label>
          <input
            id="won-order-number"
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !loading) handleSubmit();
            }}
            disabled={loading}
            placeholder="Ex.: 12345"
            className={`${controlCls} mt-1.5 w-full font-mono tabular-nums`}
            autoFocus
          />
          <p className="mt-1 text-xs text-muted-foreground">
            É a chave que liga este card ao pedido no HUB (relatórios e
            correlação). Se ainda não tiver, pode deixar em branco e preencher
            depois.
          </p>
        </div>

        {error && (
          <p
            role="alert"
            className="rounded-lg bg-urgent-wash px-3 py-2 text-xs text-urgent-ink"
          >
            {error}
          </p>
        )}
      </div>
    </Dialog>
  );
}
