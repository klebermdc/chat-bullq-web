import type { Department } from '../../api';

/** Lado de um ladrilho em pixels do mundo (a arte é desenhada nessa grade). */
export const TILE = 16;

export const T = {
  GRASS: 0,
  WALL: 1,
  WOOD: 2,
  CHECKER: 3,
  DOOR: 4,
  PATH: 5,
  CARPET_DIRETORIA: 10,
  CARPET_COMERCIAL: 11,
  CARPET_GUIAMENTO: 12,
  CARPET_TECNOLOGIA: 13,
} as const;
export type TileKind = (typeof T)[keyof typeof T];

export interface Point {
  x: number;
  y: number;
}

export interface Rect extends Point {
  w: number;
  h: number;
}

export const AREA_IDS = ['reuniao', 'posVenda', 'marketing', 'financeiro', 'iaCentral'] as const;
export type AreaId = (typeof AREA_IDS)[number];

export type RoomKind = 'person' | 'area' | 'reception';

export interface WorldRoom {
  /** userId, 'reception' ou 'area:<id>'. */
  key: string;
  kind: RoomKind;
  title: string;
  userId?: string;
  areaId?: AreaId;
  department?: Department;
  /** Piso interno (sem paredes), em ladrilhos. */
  rect: Rect;
  /** Cadeira de quem trabalha ali (pessoa, robô da IA, recepção). */
  seat: Point | null;
  /** Onde os clientes ficam de pé. */
  visitorSlots: Point[];
  /** Onde aparece o "+N" quando há mais clientes do que lugares. */
  overflowAt: Point;
}

export type PropKind =
  | 'desk' | 'chair' | 'plant' | 'bigPlant' | 'shelf' | 'cabinet' | 'table' | 'stool'
  | 'whiteboard' | 'board' | 'safe' | 'server' | 'easel' | 'counter' | 'sofa' | 'rug'
  | 'tree' | 'cooler' | 'boxes';

export interface Prop extends Rect {
  kind: PropKind;
  /** 'over' é desenhado por cima de quem está sentado atrás (mesa, balcão). */
  layer: 'under' | 'over';
  solid: boolean;
}

export interface Sign extends Point {
  label: string;
}

export interface WorldLayout {
  width: number;
  height: number;
  tiles: Uint8Array;
  solid: Uint8Array;
  /** Chave da sala de cada ladrilho; nulo em corredor, porta e área externa. */
  roomAt: (string | null)[];
  rooms: WorldRoom[];
  props: Prop[];
  signs: Sign[];
  spawn: Point;
}

const WALKABLE_TILES = new Set<number>([
  T.WOOD, T.CHECKER, T.DOOR, T.PATH,
  T.CARPET_DIRETORIA, T.CARPET_COMERCIAL, T.CARPET_GUIAMENTO, T.CARPET_TECNOLOGIA,
]);

export function isWalkable(layout: Pick<WorldLayout, 'width' | 'height' | 'tiles' | 'solid'>, x: number, y: number): boolean {
  if (x < 0 || y < 0 || x >= layout.width || y >= layout.height) return false;
  const i = y * layout.width + x;
  return WALKABLE_TILES.has(layout.tiles[i]) && layout.solid[i] === 0;
}

export function roomKeyAt(layout: Pick<WorldLayout, 'width' | 'height' | 'roomAt'>, x: number, y: number): string | null {
  if (x < 0 || y < 0 || x >= layout.width || y >= layout.height) return null;
  return layout.roomAt[y * layout.width + x];
}
