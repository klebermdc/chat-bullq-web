'use client';

import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { VirtualHqSnapshot } from '../../api';
import type { WorldRoom } from '../../lib/world/types';
import { AreaDetails, ReceptionDetails } from './area-details';
import { DepartmentSelect } from './department-select';
import { PersonDetails } from './person-details';
import { Notice } from './stat';

export interface RoomPanelProps {
  snapshot: VirtualHqSnapshot;
  room: WorldRoom;
  canManage: boolean;
  onClose: () => void;
  className?: string;
}

function Body({ snapshot, room, canManage }: Omit<RoomPanelProps, 'onClose' | 'className'>) {
  const now = new Date();
  if (room.kind === 'reception') return <ReceptionDetails snapshot={snapshot} now={now} />;
  if (room.kind === 'area' && room.areaId) return <AreaDetails areaId={room.areaId} snapshot={snapshot} />;
  const data = snapshot.rooms.find((r) => r.userId === room.userId);
  if (!data) return <Notice>Esta sala saiu do escritório.</Notice>;
  return (
    <div className="space-y-4">
      {canManage && <DepartmentSelect room={data} />}
      <PersonDetails room={data} now={now} />
    </div>
  );
}

/** Painel lateral da sala escolhida (andando, clicando no mapa ou na lista). */
export function RoomPanel({ snapshot, room, canManage, onClose, className }: RoomPanelProps) {
  return (
    <aside className={cn('rounded-lg border bg-background p-4', className)} aria-label={room.title}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="font-display text-base font-semibold">{room.title}</h2>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Fechar painel">
          <X className="size-4" />
        </Button>
      </div>
      <Body snapshot={snapshot} room={room} canManage={canManage} />
    </aside>
  );
}
