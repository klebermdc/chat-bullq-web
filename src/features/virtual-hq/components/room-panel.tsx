'use client';

import Link from 'next/link';
import { CalendarDays, MessageCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Room, VirtualHqSnapshot } from '../api';
import { presenceLabel, waitedLabel } from '../lib/office-layout';

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border bg-card p-2">
      <div className="text-lg font-semibold tabular-nums">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

const formatDay = (ymd: string) => {
  const [, m, d] = ymd.split('-');
  return `${d}/${m}`;
};

function RoomDetails({ room, now }: { room: Room; now: Date }) {
  const waited = waitedLabel(room.awaitingOldestSince, now);
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {presenceLabel(room.presence)}
        {waited && <> · cliente esperando há {waited}</>}
      </p>
      <div className="grid grid-cols-2 gap-2">
        <Stat label="Na carteira" value={room.stats.openTotal} />
        <Stat label="Esperando resposta" value={room.stats.awaitingReply} />
        <Stat label="Recebidos hoje" value={room.stats.assignedToday} />
        <Stat label="Finalizados hoje" value={room.stats.closedToday} />
      </div>
      {room.stats.avgPickupMinutes !== null && (
        <p className="text-xs text-muted-foreground">
          Tempo médio até a 1ª resposta hoje: {room.stats.avgPickupMinutes} min
        </p>
      )}

      <section className="space-y-2">
        <h3 className="text-sm font-semibold">Clientes</h3>
        {room.clients.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma conversa aberta.</p>
        ) : (
          <ul className="space-y-1.5">
            {room.clients.map((c) => (
              <li key={c.conversationId}>
                <Link
                  href={`/inbox?conversationId=${c.conversationId}`}
                  className="flex items-center gap-2 rounded-md border bg-card px-2.5 py-2 text-sm hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"
                >
                  <MessageCircle className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{c.name}</span>
                    {c.phoneMasked && <span className="block text-xs text-muted-foreground">{c.phoneMasked}</span>}
                  </span>
                  {c.awaitingReply && (
                    <span className="rounded-full bg-warning-wash px-2 py-0.5 text-xs text-warning-ink">Esperando</span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {room.guide && (
        <section className="space-y-2">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold">
            <CalendarDays className="size-4" aria-hidden /> Guiamentos (14 dias)
          </h3>
          {room.guide.dates.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum guiamento marcado.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {room.guide.dates.map((d) => (
                <li key={`${d.contractId}-${d.date}-${d.parkLabel}`} className="flex gap-2">
                  <span className="w-11 shrink-0 tabular-nums text-muted-foreground">{formatDay(d.date)}</span>
                  <span className="min-w-0 flex-1 truncate">
                    {d.parkLabel} · {d.clientName}
                  </span>
                  {!d.purchased && <span className="text-xs text-warning-ink">ingresso pendente</span>}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}

function ReceptionDetails({ reception, now }: { reception: NonNullable<VirtualHqSnapshot['reception']>; now: Date }) {
  const waited = waitedLabel(reception.oldestSince, now);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <Stat label="Sem dono agora" value={reception.unassigned} />
        <Stat label="Entraram hoje" value={reception.enteredToday} />
      </div>
      {waited && <p className="text-sm text-muted-foreground">O mais antigo sem dono espera há {waited}.</p>}
      <Link href="/inbox" className="text-sm font-medium text-primary underline-offset-4 hover:underline">
        Abrir a caixa de entrada
      </Link>
    </div>
  );
}

export interface RoomPanelProps {
  snapshot: VirtualHqSnapshot;
  selectedKey: string;
  onClose: () => void;
  className?: string;
}

/** Painel lateral da sala escolhida no mapa. */
export function RoomPanel({ snapshot, selectedKey, onClose, className }: RoomPanelProps) {
  const now = new Date();
  const room = snapshot.rooms.find((r) => r.userId === selectedKey);
  const isReception = selectedKey === 'reception' && !!snapshot.reception;
  if (!room && !isReception) return null;
  const title = room ? `Sala de ${room.name}` : 'Recepção';
  return (
    <aside className={cn('rounded-lg border bg-background p-4', className)} aria-label={title}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="font-display text-base font-semibold">{title}</h2>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Fechar painel">
          <X className="size-4" />
        </Button>
      </div>
      {room ? (
        <RoomDetails room={room} now={now} />
      ) : (
        <ReceptionDetails reception={snapshot.reception!} now={now} />
      )}
    </aside>
  );
}
