import type { IntentLevel, PresenceStatus, RoomAlert, VirtualHqSnapshot } from '../../api';
import { hashString, lookFor, SHIRT_COLORS, type AvatarLook } from './color-hash';
import type { Point, WorldLayout } from './types';

export interface ScenePerson {
  name: string;
  shortName: string;
  presence: PresenceStatus;
  look: AvatarLook;
  /** A cadeira de quem está jogando fica vazia: ele está andando pelo mapa. */
  isPlayer: boolean;
}

export interface SceneVisitor {
  id: string;
  look: AvatarLook;
  waiting: boolean;
  /** Faixa da nota de intenção; nulo na recepção e em API antiga. */
  heat: IntentLevel | null;
  suitcase: boolean;
  at: Point;
}

export interface SceneRoom {
  key: string;
  person: ScenePerson | null;
  robot: boolean;
  visitors: SceneVisitor[];
  overflow: number;
  alert: RoomAlert;
}

const VALID_PRESENCE = new Set<PresenceStatus>(['online', 'away', 'offline']);
const VALID_ALERT = new Set<RoomAlert>(['calm', 'attention', 'alert']);
const VALID_HEAT = new Set<IntentLevel>(['hot', 'warm', 'cold']);

export function shortName(name: string): string {
  const first = name.trim().split(/\s+/)[0] ?? '';
  return first || name;
}

function visitorLook(id: string): AvatarLook {
  const base = lookFor(id);
  return { ...base, hair: SHIRT_COLORS[(hashString(id) >>> 5) % SHIRT_COLORS.length] };
}

function placeVisitors(
  slots: readonly Point[],
  items: ReadonlyArray<{ id: string; waiting: boolean; heat?: IntentLevel | null }>,
): { visitors: SceneVisitor[]; overflow: number } {
  const visible = items.slice(0, slots.length);
  return {
    visitors: visible.map((v, i) => ({
      id: v.id,
      look: visitorLook(v.id),
      waiting: v.waiting,
      heat: v.heat && VALID_HEAT.has(v.heat) ? v.heat : null,
      suitcase: hashString(v.id) % 3 === 0,
      at: slots[i],
    })),
    overflow: Math.max(0, items.length - visible.length),
  };
}

/** O que muda a cada minuto (gente, clientes, alertas) por sala do mapa. */
export function buildScene(layout: WorldLayout, snapshot: VirtualHqSnapshot, playerId: string | null): SceneRoom[] {
  const byId = new Map((snapshot.rooms ?? []).map((r) => [r.userId, r]));
  return layout.rooms.map((room): SceneRoom => {
    if (room.kind === 'person' && room.userId) {
      const data = byId.get(room.userId);
      const clients = (data?.clients ?? []).map((c) => ({
        id: c.conversationId,
        waiting: !!c.awaitingReply,
        heat: c.intent?.level ?? null,
      }));
      const presence = data && VALID_PRESENCE.has(data.presence) ? data.presence : 'offline';
      return {
        key: room.key,
        person: data
          ? {
              name: data.name,
              shortName: shortName(data.name),
              presence,
              look: lookFor(data.userId),
              isPlayer: data.userId === playerId,
            }
          : null,
        robot: false,
        ...placeVisitors(room.visitorSlots, clients),
        alert: data && VALID_ALERT.has(data.alert) ? data.alert : 'calm',
      };
    }
    if (room.kind === 'reception') {
      const unassigned = Math.max(0, snapshot.reception?.unassigned ?? 0);
      const items = Array.from({ length: unassigned }, (_, i) => ({ id: `recepcao-${i}`, waiting: true }));
      return {
        key: room.key,
        person: null,
        robot: true,
        ...placeVisitors(room.visitorSlots, items),
        alert: unassigned > 0 ? 'attention' : 'calm',
      };
    }
    return { key: room.key, person: null, robot: room.areaId === 'iaCentral', visitors: [], overflow: 0, alert: 'calm' };
  });
}

/** Resumo em texto do mapa, para leitor de tela. */
export function describeScene(snapshot: VirtualHqSnapshot): string {
  const rooms = snapshot.rooms ?? [];
  const atDesk = rooms.filter((r) => r.presence === 'online').length;
  const waiting = rooms.reduce((sum, r) => sum + (r.stats?.awaitingReply ?? 0), 0);
  const alerts = rooms.filter((r) => r.alert === 'alert').length;
  const hot = rooms.reduce((sum, r) => sum + (r.intent?.hot ?? 0), 0);
  const parts = [
    `Escritório com ${rooms.length} ${rooms.length === 1 ? 'sala' : 'salas'} de pessoas`,
    `${atDesk} na mesa`,
    `${waiting} ${waiting === 1 ? 'cliente esperando' : 'clientes esperando'} resposta`,
  ];
  if (hot > 0) parts.push(`${hot} ${hot === 1 ? 'cliente quente' : 'clientes quentes'}`);
  if (alerts > 0) parts.push(`${alerts} em alerta`);
  return `${parts.join(', ')}. Use a lista de salas abaixo para abrir cada uma.`;
}
