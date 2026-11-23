import { clampCamera, type Size } from './camera';
import { idlePlayer, isMoving, playerPosition, stepPlayer, type Direction, type PlayerState } from './player';
import { isWalkable, roomKeyAt, TILE, type Point, type WorldLayout } from './types';

/** Estado vivo do jogo; fica num ref para não renderizar o React a cada quadro. */
export interface Engine {
  player: PlayerState;
  lastRoom: string | null;
  camera: { pos: Point; follow: boolean; target: Point | null };
  held: readonly Direction[];
}

/** Câmera persegue o jogador; com movimento reduzido, pula direto. */
const CAMERA_EASE = 8;

export function createEngine(spawn: Point, layout: WorldLayout): Engine {
  return {
    player: idlePlayer(spawn),
    lastRoom: roomKeyAt(layout, spawn.x, spawn.y),
    camera: { pos: tileCenter(spawn), follow: true, target: null },
    held: [],
  };
}

export const tileCenter = (p: Point): Point => ({ x: (p.x + 0.5) * TILE, y: (p.y + 0.5) * TILE });

/** Onde o jogador começa: na porta da própria sala, ou na entrada da recepção. */
export function spawnFor(layout: WorldLayout, playerId: string | null): Point {
  const own = layout.rooms.find((r) => r.kind === 'person' && r.userId === playerId);
  if (own) {
    const inside = { x: own.rect.x + 1, y: own.rect.y + 1 };
    if (isWalkable(layout, inside.x, inside.y)) return inside;
  }
  return layout.spawn;
}

export interface TickResult {
  engine: Engine;
  enteredRoom: string | null;
}

/** Um passo do jogo: anda, vê se entrou numa sala e move a câmera. */
export function tickEngine(
  e: Engine,
  layout: WorldLayout,
  dt: number,
  view: Size,
  scale: number,
  smooth: boolean,
): TickResult {
  const walkable = (x: number, y: number) => isWalkable(layout, x, y);
  const held = e.held.length ? e.held[e.held.length - 1] : null;
  const player = stepPlayer(e.player, held, dt, walkable);
  const pos = playerPosition(player);
  const here = roomKeyAt(layout, Math.round(pos.x), Math.round(pos.y));
  const enteredRoom = here !== e.lastRoom && here ? here : null;

  const follow = e.camera.follow || (isMoving(player) && !isMoving(e.player));
  const goal = follow ? tileCenter(pos) : (e.camera.target ?? e.camera.pos);
  const k = smooth ? Math.min(1, dt * CAMERA_EASE) : 1;
  const raw = { x: e.camera.pos.x + (goal.x - e.camera.pos.x) * k, y: e.camera.pos.y + (goal.y - e.camera.pos.y) * k };
  const world = { w: layout.width * TILE, h: layout.height * TILE };
  const camPos = clampCamera(raw, view, scale, world);

  return {
    engine: {
      ...e,
      player,
      lastRoom: here,
      camera: { pos: camPos, follow, target: follow ? null : e.camera.target },
    },
    enteredRoom,
  };
}
