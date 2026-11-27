'use client';

import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { controlCls } from '@/components/ui/control';
import { getErrorMessage } from '@/lib/errors';
import {
  REASON_MAX,
  SUPPORT_CATEGORY_OPTIONS,
  SUPPORT_PRIORITY_OPTIONS,
  isReasonValid,
  type SupportCategory,
  type SupportPriority,
} from '../lib/support-ticket-options';
import { supportTicketsService } from '../services/support-tickets.service';

interface Props {
  open: boolean;
  onClose: () => void;
  conversationId: string;
  contactName: string | null;
}

/**
 * Vendedor coloca o cliente no Suporte para atenção especial do Kleber ou
 * problema crítico. O Agente de Suporte avisa no Telegram que foi manual.
 */
export function OpenSupportTicketDialog({ open, onClose, conversationId, contactName }: Props) {
  const qc = useQueryClient();
  const [category, setCategory] = useState<SupportCategory>('outro');
  const [priority, setPriority] = useState<SupportPriority>('alta');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCategory('outro');
    setPriority('alta');
    setReason('');
  }, [open]);

  const submit = async () => {
    if (!isReasonValid(reason)) return;
    setBusy(true);
    try {
      const res = await supportTicketsService.openManual({ conversationId, category, priority, reason });
      toast.success(
        res.isNew
          ? `Chamado ${res.ticketNumber} aberto. O Kleber foi avisado.`
          : `O cliente já tinha o chamado ${res.ticketNumber}: seu pedido foi anexado e o Kleber foi avisado.`,
      );
      qc.invalidateQueries({ queryKey: ['messages', conversationId] });
      qc.invalidateQueries({ queryKey: ['conversation', conversationId] });
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Não foi possível abrir o chamado'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Colocar no Suporte"
      description={`Abre um chamado para ${contactName || 'este cliente'} no quadro Suporte e avisa o Kleber no Telegram. Use para atenção especial ou problema crítico.`}
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="button" onClick={submit} disabled={!isReasonValid(reason)} loading={busy}>
            Abrir chamado
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="ticket-category" className="text-sm font-medium text-foreground">
              Tipo
            </label>
            <select
              id="ticket-category"
              value={category}
              onChange={(e) => setCategory(e.target.value as SupportCategory)}
              className={`${controlCls} w-full`}
            >
              {SUPPORT_CATEGORY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="ticket-priority" className="text-sm font-medium text-foreground">
              Prioridade
            </label>
            <select
              id="ticket-priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value as SupportPriority)}
              className={`${controlCls} w-full`}
            >
              {SUPPORT_PRIORITY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="ticket-reason" className="text-sm font-medium text-foreground">
            Motivo
          </label>
          <textarea
            id="ticket-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            maxLength={REASON_MAX}
            placeholder="Ex.: cliente VIP, quer falar com o Kleber sobre o pacote de 10 pessoas"
            className={`${controlCls} h-auto w-full resize-none py-2`}
          />
          <p className="text-xs text-muted-foreground">
            O Kleber lê isso no Telegram. Diga o que aconteceu e o que precisa.
          </p>
        </div>
      </div>
    </Dialog>
  );
}
