'use client';

import { Flame } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DEPARTMENTS, type Department, type VirtualHqSnapshot } from '../../api';
import { DEPARTMENT_LABEL } from '../../lib/world/departments';
import type { WorldRoom } from '../../lib/world/types';

interface RoomListProps {
  rooms: readonly WorldRoom[];
  snapshot: VirtualHqSnapshot;
  selectedKey: string | null;
  onSelect: (key: string) => void;
}

const DOT = { online: 'bg-success', away: 'bg-warning', offline: 'bg-muted-foreground/40' } as const;

function RoomButton({ room, snapshot, selected, onSelect }: {
  room: WorldRoom;
  snapshot: VirtualHqSnapshot;
  selected: boolean;
  onSelect: () => void;
}) {
  const data = room.userId ? snapshot.rooms.find((r) => r.userId === room.userId) : undefined;
  const waiting = data?.stats?.awaitingReply ?? (room.kind === 'reception' ? snapshot.reception?.unassigned ?? 0 : 0);
  const label = data ? data.name : room.title;
  const alert = data?.alert;
  const hot = data?.intent?.hot ?? 0;
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        className={cn(
          'flex h-8 items-center gap-1.5 rounded-md border bg-card px-2.5 text-xs font-medium hover:bg-accent',
          'focus-visible:outline-2 focus-visible:outline-ring',
          selected && 'border-primary bg-primary/10',
          alert === 'alert' && 'border-urgent',
          alert === 'attention' && 'border-warning',
        )}
      >
        {data && <span className={cn('size-2 shrink-0 rounded-full', DOT[data.presence] ?? DOT.offline)} aria-hidden />}
        <span className="max-w-40 truncate">{label}</span>
        {waiting > 0 && (
          <span className="rounded-full bg-warning-wash px-1.5 text-[11px] tabular-nums text-warning-ink">
            {waiting}
            <span className="sr-only"> esperando</span>
          </span>
        )}
        {hot > 0 && (
          <span className="inline-flex items-center gap-0.5 rounded-full bg-urgent-wash px-1.5 text-[11px] tabular-nums text-urgent-ink">
            <Flame className="size-3" aria-hidden />
            {hot}
            <span className="sr-only"> {hot === 1 ? 'quente' : 'quentes'}</span>
          </span>
        )}
      </button>
    </li>
  );
}

/** Alternativa acessível ao mapa: todas as salas como botões, por ala. */
export function RoomList({ rooms, snapshot, selectedKey, onSelect }: RoomListProps) {
  const groups: Array<{ title: string; items: WorldRoom[] }> = [
    { title: 'Áreas', items: rooms.filter((r) => r.kind !== 'person') },
    ...DEPARTMENTS.map((d: Department) => ({
      title: DEPARTMENT_LABEL[d],
      items: rooms.filter((r) => r.kind === 'person' && r.department === d),
    })),
  ].filter((g) => g.items.length > 0);

  return (
    <nav aria-label="Salas do escritório" className="space-y-2">
      {groups.map((g) => (
        <section key={g.title} className="flex flex-wrap items-center gap-1.5">
          <h3 className="w-24 shrink-0 text-xs font-semibold text-muted-foreground">{g.title}</h3>
          <ul className="flex flex-wrap gap-1.5">
            {g.items.map((room) => (
              <RoomButton
                key={room.key}
                room={room}
                snapshot={snapshot}
                selected={room.key === selectedKey}
                onSelect={() => onSelect(room.key)}
              />
            ))}
          </ul>
        </section>
      ))}
    </nav>
  );
}
