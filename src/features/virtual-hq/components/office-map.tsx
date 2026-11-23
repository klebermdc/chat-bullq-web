'use client';

import type { KeyboardEvent } from 'react';
import { cn } from '@/lib/utils';
import type { PresenceStatus, Room, RoomAlert, VirtualHqSnapshot } from '../api';
import { iso, layoutOffice, presenceLabel, ROOM_CELLS, type Point, type Slot } from '../lib/office-layout';

const WALL_H = 26;
const GAP_CELLS = 2;
const MAX_CLIENT_DOTS = 8;
const PADDING = 40;

const toPoints = (pts: Point[]) => pts.map((p) => `${p.x},${p.y}`).join(' ');
const shift = (p: Point, dy: number): Point => ({ x: p.x, y: p.y + dy });

/** Cantos do piso de uma sala na posição (row, col). */
function floorOf(slot: Slot) {
  const ox = slot.col * (ROOM_CELLS + GAP_CELLS);
  const oy = slot.row * (ROOM_CELLS + GAP_CELLS);
  return {
    top: iso(ox, oy),
    right: iso(ox + ROOM_CELLS, oy),
    bottom: iso(ox + ROOM_CELLS, oy + ROOM_CELLS),
    left: iso(ox, oy + ROOM_CELLS),
    at: (cx: number, cy: number) => iso(ox + cx, oy + cy),
  };
}

const PRESENCE_FILL: Record<PresenceStatus, string> = {
  online: 'fill-primary',
  away: 'fill-warning',
  offline: 'fill-muted-foreground/40',
};

const ALERT_WALL: Record<RoomAlert, string> = {
  calm: 'fill-card stroke-border',
  attention: 'fill-warning-wash stroke-warning',
  alert: 'fill-urgent-wash stroke-urgent',
};

function RoomShell({ slot, alert }: { slot: Slot; alert: RoomAlert }) {
  const f = floorOf(slot);
  const up = -WALL_H;
  return (
    <>
      <polygon points={toPoints([f.top, f.right, f.bottom, f.left])} className="fill-muted stroke-border" />
      <polygon
        points={toPoints([f.left, f.top, shift(f.top, up), shift(f.left, up)])}
        className={cn('stroke-[1]', ALERT_WALL[alert])}
      />
      <polygon
        points={toPoints([f.top, f.right, shift(f.right, up), shift(f.top, up)])}
        className={cn('stroke-[1]', ALERT_WALL[alert])}
      />
    </>
  );
}

function Desk({ at }: { at: Point }) {
  const w = 22;
  const h = 8;
  return (
    <g>
      <polygon
        points={toPoints([
          { x: at.x, y: at.y - h },
          { x: at.x + w, y: at.y - h + w / 2 },
          { x: at.x, y: at.y - h + w },
          { x: at.x - w, y: at.y - h + w / 2 },
        ])}
        className="fill-secondary stroke-border"
      />
      <rect x={at.x - 6} y={at.y - h - 12} width={12} height={9} rx={1.5} className="fill-foreground/70" />
    </g>
  );
}

function Person({ at, presence }: { at: Point; presence: PresenceStatus }) {
  if (presence === 'offline') return null;
  return (
    <g className={cn(presence === 'online' && 'motion-safe:animate-pulse [animation-duration:3s]')}>
      <rect x={at.x - 6} y={at.y - 20} width={12} height={16} rx={5} className={PRESENCE_FILL[presence]} />
      <circle cx={at.x} cy={at.y - 25} r={6} className="fill-foreground/80" />
    </g>
  );
}

function ClientDots({ room, slot }: { room: Room; slot: Slot }) {
  const f = floorOf(slot);
  return (
    <>
      {room.clients.slice(0, MAX_CLIENT_DOTS).map((c, i) => {
        const p = f.at(0.7 + (i % 4) * 0.75, 3.2 + Math.floor(i / 4) * 0.5);
        return (
          <rect
            key={c.conversationId}
            x={p.x - 4}
            y={p.y - 4}
            width={8}
            height={8}
            rx={2}
            className={c.awaitingReply ? 'fill-warning' : 'fill-primary/50'}
          />
        );
      })}
    </>
  );
}

function Label({ at, title, subtitle }: { at: Point; title: string; subtitle: string }) {
  return (
    <g className="pointer-events-none">
      <text x={at.x} y={at.y} textAnchor="middle" className="fill-foreground text-[11px] font-semibold">
        {title}
      </text>
      <text x={at.x} y={at.y + 13} textAnchor="middle" className="fill-muted-foreground text-[10px]">
        {subtitle}
      </text>
    </g>
  );
}

function Badge({ at, value, tone }: { at: Point; value: number; tone: RoomAlert }) {
  if (value <= 0) return null;
  return (
    <g className="pointer-events-none">
      <circle
        cx={at.x}
        cy={at.y}
        r={10}
        className={tone === 'alert' ? 'fill-urgent' : 'fill-warning'}
      />
      <text x={at.x} y={at.y + 3.5} textAnchor="middle" className="fill-white text-[10px] font-bold">
        {value}
      </text>
    </g>
  );
}

interface Selectable {
  selected: boolean;
  onSelect: () => void;
  label: string;
}

function Clickable({ selected, onSelect, label, children }: Selectable & { children: React.ReactNode }) {
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect();
    }
  };
  return (
    <g
      role="button"
      tabIndex={0}
      aria-label={label}
      aria-pressed={selected}
      onClick={onSelect}
      onKeyDown={onKey}
      className={cn(
        'cursor-pointer outline-none transition-opacity [&:focus-visible_polygon]:stroke-ring [&:focus-visible_polygon]:stroke-2',
        selected ? 'opacity-100' : 'opacity-90 hover:opacity-100',
      )}
    >
      {children}
    </g>
  );
}

function RoomTile({ room, slot, ...sel }: { room: Room; slot: Slot } & Selectable) {
  const f = floorOf(slot);
  const deskAt = f.at(ROOM_CELLS / 2, ROOM_CELLS / 2 - 0.6);
  const personAt = f.at(ROOM_CELLS / 2 - 0.3, ROOM_CELLS / 2 + 0.4);
  return (
    <Clickable {...sel}>
      <RoomShell slot={slot} alert={room.alert} />
      <Desk at={deskAt} />
      <Person at={personAt} presence={room.presence} />
      <ClientDots room={room} slot={slot} />
    </Clickable>
  );
}

function ReceptionTile({
  slot,
  reception,
  ...sel
}: { slot: Slot; reception: NonNullable<VirtualHqSnapshot['reception']> } & Selectable) {
  const f = floorOf(slot);
  const alert: RoomAlert = reception.unassigned > 0 ? 'attention' : 'calm';
  return (
    <Clickable {...sel}>
      <RoomShell slot={slot} alert={alert} />
      <Desk at={f.at(ROOM_CELLS / 2, ROOM_CELLS / 2)} />
    </Clickable>
  );
}

/** Nome e contador por cima de todas as salas, para nenhuma parede cobrir. */
function Overlay({ slot, snapshot, room }: { slot: Slot; snapshot: VirtualHqSnapshot; room?: Room }) {
  const f = floorOf(slot);
  const badgeAt = shift(f.right, -WALL_H - 2);
  const labelAt = shift(f.bottom, 16);
  if (room) {
    return (
      <>
        <Badge at={badgeAt} value={room.stats.awaitingReply} tone={room.alert} />
        <Label at={labelAt} title={room.name} subtitle={presenceLabel(room.presence)} />
      </>
    );
  }
  const r = snapshot.reception;
  if (!r) return null;
  return (
    <>
      <Badge at={badgeAt} value={r.unassigned} tone={r.unassigned > 0 ? 'attention' : 'calm'} />
      <Label at={labelAt} title="Recepção" subtitle={`${r.enteredToday} entraram hoje`} />
    </>
  );
}

function viewBoxOf(slots: Slot[]): string {
  const pts = slots.flatMap((s) => {
    const f = floorOf(s);
    return [f.top, f.right, f.bottom, f.left];
  });
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const minX = Math.min(...xs) - PADDING;
  const minY = Math.min(...ys) - WALL_H - PADDING;
  const w = Math.max(...xs) - minX + PADDING;
  const h = Math.max(...ys) - minY + PADDING;
  return `${minX} ${minY} ${w} ${h}`;
}

export interface OfficeMapProps {
  snapshot: VirtualHqSnapshot;
  selectedKey: string | null;
  onSelect: (key: string) => void;
}

/** Planta isométrica do escritório: uma sala por pessoa, recepção na frente. */
export function OfficeMap({ snapshot, selectedKey, onSelect }: OfficeMapProps) {
  // Pinta de trás para a frente (row + col), como em todo mapa isométrico.
  const slots = [...layoutOffice(snapshot.rooms, !!snapshot.reception)].sort(
    (a, b) => a.row + a.col - (b.row + b.col),
  );
  if (slots.length === 0) return null;
  const roomBy = new Map(snapshot.rooms.map((r) => [r.userId, r]));
  return (
    <svg viewBox={viewBoxOf(slots)} className="h-auto w-full max-w-5xl" role="group" aria-label="Escritório virtual">
      {slots.map((slot) => {
        const sel = { selected: selectedKey === slot.key, onSelect: () => onSelect(slot.key) };
        if (slot.key === 'reception' && snapshot.reception) {
          return (
            <ReceptionTile
              key={slot.key}
              slot={slot}
              reception={snapshot.reception}
              label={`Recepção: ${snapshot.reception.unassigned} sem dono`}
              {...sel}
            />
          );
        }
        const room = roomBy.get(slot.key);
        if (!room) return null;
        return (
          <RoomTile
            key={slot.key}
            room={room}
            slot={slot}
            label={`Sala de ${room.name}: ${room.stats.awaitingReply} esperando resposta`}
            {...sel}
          />
        );
      })}
      {slots.map((slot) => (
        <Overlay key={`o-${slot.key}`} slot={slot} snapshot={snapshot} room={roomBy.get(slot.key)} />
      ))}
    </svg>
  );
}
