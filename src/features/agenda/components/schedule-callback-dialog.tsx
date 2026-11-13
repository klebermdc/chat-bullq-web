'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { controlCls } from '@/components/ui/control';
import { getErrorMessage } from '@/lib/errors';
import { cn } from '@/lib/utils';
import { AGENDA_QUERY_KEY, createAppointment, fetchFreeSlots, rescheduleAppointment } from '../api';
import { slotLabel } from '../format';

const SLOT_COUNT = 8;

interface Props {
  open: boolean;
  onClose: () => void;
  /** Vendedor da agenda (gestão marca para outro; atendente sempre na própria). */
  ownerUserId?: string;
  ownerName?: string;
  /** Marcar novo: contato (e conversa, se houver). */
  contactId?: string;
  conversationId?: string;
  contactName?: string | null;
  /** Remarcar: id do compromisso. */
  rescheduleId?: string;
}

/** Escolhe um horário livre real do vendedor e marca (ou remarca) o retorno. */
export function ScheduleCallbackDialog({
  open,
  onClose,
  ownerUserId,
  ownerName,
  contactId,
  conversationId,
  contactName,
  rescheduleId,
}: Props) {
  const queryClient = useQueryClient();
  const [slot, setSlot] = useState<string | null>(null);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (open) {
      setSlot(null);
      setNotes('');
    }
  }, [open]);

  const slots = useQuery({
    queryKey: [...AGENDA_QUERY_KEY, 'free-slots', ownerUserId ?? 'me'],
    queryFn: () => fetchFreeSlots({ ownerUserId, count: SLOT_COUNT }),
    enabled: open,
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!slot) throw new Error('Escolha um horário');
      if (rescheduleId) return rescheduleAppointment(rescheduleId, slot);
      if (!contactId) throw new Error('Contato não informado');
      return createAppointment({ contactId, conversationId, ownerUserId, startsAt: slot, notes: notes.trim() || undefined });
    },
    onSuccess: () => {
      toast.success(rescheduleId ? 'Retorno remarcado' : 'Retorno marcado na agenda');
      queryClient.invalidateQueries({ queryKey: AGENDA_QUERY_KEY });
      onClose();
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Não foi possível marcar esse horário.')),
  });

  const title = rescheduleId ? 'Remarcar retorno' : 'Marcar retorno';
  const who = [contactName && `com ${contactName}`, ownerName && `na agenda de ${ownerName}`].filter(Boolean).join(' ');

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      description={who ? `Horários livres ${who}.` : 'Horários livres no seu expediente.'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={() => save.mutate()} loading={save.isPending} disabled={!slot}>
            {title}
          </Button>
        </>
      }
    >
      {slots.isLoading && <p className="text-sm text-muted-foreground">Buscando horários livres…</p>}
      {slots.isError && <p className="text-sm text-destructive">{getErrorMessage(slots.error, 'Não foi possível carregar os horários.')}</p>}
      {slots.data && slots.data.slots.length === 0 && (
        <p className="text-sm text-muted-foreground">Nenhum horário livre nos próximos 7 dias. Confira o horário de atendimento do vendedor.</p>
      )}
      {slots.data && slots.data.slots.length > 0 && (
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Horários livres">
          {slots.data.slots.map((iso) => (
            <button
              key={iso}
              type="button"
              role="radio"
              aria-checked={slot === iso}
              onClick={() => setSlot(iso)}
              className={cn(
                'rounded-lg border px-3 py-2 text-left text-sm transition-colors',
                slot === iso ? 'border-primary bg-primary/10 text-primary' : 'border-input hover:bg-muted',
              )}
            >
              {slotLabel(iso)}
            </button>
          ))}
        </div>
      )}
      {!rescheduleId && (
        <label className="mt-4 block text-sm">
          <span className="mb-1 block text-muted-foreground">Assunto (opcional)</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={1000}
            rows={3}
            placeholder="Ex.: tirar dúvidas da cotação de julho"
            className={cn(controlCls, 'h-auto py-2')}
          />
        </label>
      )}
    </Dialog>
  );
}
