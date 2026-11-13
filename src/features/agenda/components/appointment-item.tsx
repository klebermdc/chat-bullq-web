'use client';

import Link from 'next/link';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { getErrorMessage } from '@/lib/errors';
import { AGENDA_QUERY_KEY, setAppointmentStatus, type Appointment, type AppointmentStatus } from '../api';
import { KIND_LABEL, SOURCE_LABEL, STATUS_LABEL, timeLabel } from '../format';

const STATUS_VARIANT: Record<AppointmentStatus, 'brand' | 'success' | 'neutral' | 'hot'> = {
  MARCADO: 'brand',
  FEITO: 'success',
  CANCELADO: 'neutral',
  NAO_ATENDEU: 'hot',
};

interface Props {
  item: Appointment;
  showOwner: boolean;
  onReschedule: (item: Appointment) => void;
}

export function AppointmentItem({ item, showOwner, onReschedule }: Props) {
  const queryClient = useQueryClient();
  const { confirm, confirmDialog } = useConfirm();
  const status = useMutation({
    mutationFn: (next: AppointmentStatus) => setAppointmentStatus(item.id, next),
    onSuccess: (_d, next) => {
      toast.success(`Marcado como ${STATUS_LABEL[next].toLowerCase()}`);
      queryClient.invalidateQueries({ queryKey: AGENDA_QUERY_KEY });
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Não foi possível atualizar o compromisso.')),
  });

  const cancel = async () => {
    const ok = await confirm({
      title: 'Cancelar este retorno?',
      description: `O lembrete das ${timeLabel(item.startsAt)} para ${item.contact.name ?? 'o cliente'} deixa de tocar.`,
      confirmLabel: 'Cancelar retorno',
      cancelLabel: 'Voltar',
      destructive: true,
    });
    if (ok) status.mutate('CANCELADO');
  };

  const name = item.contact.name ?? item.contact.phone ?? 'Cliente';
  const active = item.status === 'MARCADO';

  return (
    <li className="flex flex-col gap-2 rounded-lg border border-border p-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold tabular-nums">{timeLabel(item.startsAt)}</span>
          {item.conversationId ? (
            <Link href={`/inbox?conversationId=${item.conversationId}`} className="truncate font-medium hover:underline">
              {name}
            </Link>
          ) : (
            <span className="truncate font-medium">{name}</span>
          )}
          <Badge variant={STATUS_VARIANT[item.status]}>{STATUS_LABEL[item.status]}</Badge>
          {item.source !== 'MANUAL' && <Badge variant="info">{SOURCE_LABEL[item.source]}</Badge>}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {KIND_LABEL[item.kind]} · {item.durationMin} min{showOwner ? ` · ${item.owner.name}` : ''}
        </p>
        {item.notes && <p className="mt-1 text-sm">{item.notes}</p>}
      </div>
      {active && (
        <div className="flex flex-wrap gap-1.5">
          <Button size="sm" variant="outline" onClick={() => status.mutate('FEITO')} disabled={status.isPending}>
            Feito
          </Button>
          <Button size="sm" variant="ghost" onClick={() => status.mutate('NAO_ATENDEU')} disabled={status.isPending}>
            Não atendeu
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onReschedule(item)}>
            Remarcar
          </Button>
          <Button size="sm" variant="ghost" onClick={cancel} disabled={status.isPending}>
            Cancelar
          </Button>
        </div>
      )}
      {confirmDialog}
    </li>
  );
}
