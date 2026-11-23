import type { PresenceStatus, Room } from '../api';

/** Meia largura / meia altura do losango de uma célula da grade. */
export const TILE_HALF_W = 32;
export const TILE_HALF_H = 16;
/** Células por sala (lado do piso). */
export const ROOM_CELLS = 4;
/** Salas por fileira antes de quebrar. */
export const ROOMS_PER_ROW = 4;

export interface Point {
  x: number;
  y: number;
}

/** Projeção isométrica de uma célula (x, y) da grade. */
export function iso(x: number, y: number): Point {
  return { x: (x - y) * TILE_HALF_W, y: (x + y) * TILE_HALF_H };
}

export interface Slot {
  /** 'reception' ou o userId da sala. */
  key: string;
  row: number;
  col: number;
}

function placeRow(keys: string[], firstRow: number): Slot[] {
  return keys.map((key, i) => ({
    key,
    row: firstRow + Math.floor(i / ROOMS_PER_ROW),
    col: i % ROOMS_PER_ROW,
  }));
}

const rowsFor = (n: number) => Math.ceil(n / ROOMS_PER_ROW);

/**
 * Recepção na frente (só a gestão vê), depois uma fileira por departamento:
 * diretoria e comercial. As salas já vêm ordenadas da API.
 */
export function layoutOffice(rooms: readonly Room[], withReception: boolean): Slot[] {
  const reception = withReception ? [{ key: 'reception', row: 0, col: 0 }] : [];
  const directors = rooms.filter((r) => r.department === 'diretoria').map((r) => r.userId);
  const sales = rooms.filter((r) => r.department === 'comercial').map((r) => r.userId);
  const directorsRow = reception.length;
  const salesRow = directorsRow + rowsFor(directors.length);
  return [...reception, ...placeRow(directors, directorsRow), ...placeRow(sales, salesRow)];
}

const PRESENCE_LABEL: Record<PresenceStatus, string> = {
  online: 'Na mesa',
  away: 'Ausente',
  offline: 'Fora',
};

export function presenceLabel(status: PresenceStatus): string {
  return PRESENCE_LABEL[status];
}

/** "5 min", "2h30"; nulo sem espera. */
export function waitedLabel(since: string | null, now: Date): string | null {
  if (!since) return null;
  const minutes = Math.max(0, Math.round((now.getTime() - new Date(since).getTime()) / 60_000));
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`;
}
