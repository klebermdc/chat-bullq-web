import type { Point } from './types';

export type Direction = 'up' | 'down' | 'left' | 'right';

/** Ladrilhos por segundo. */
export const WALK_SPEED = 6;

export const DIR_STEP: Record<Direction, Point> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

export interface PlayerState {
  /** Ladrilho de onde saiu e para onde vai; iguais quando parado. */
  from: Point;
  to: Point;
  /** 0..1 entre `from` e `to`. */
  progress: number;
  facing: Direction;
  path: readonly Point[];
  /** Distância andada, para animar os passos. */
  walked: number;
}

export function idlePlayer(at: Point): PlayerState {
  return { from: at, to: at, progress: 1, facing: 'down', path: [], walked: 0 };
}

export function isMoving(p: PlayerState): boolean {
  return p.progress < 1;
}

export function playerPosition(p: PlayerState): Point {
  const t = Math.min(1, p.progress);
  return { x: p.from.x + (p.to.x - p.from.x) * t, y: p.from.y + (p.to.y - p.from.y) * t };
}

function facingTo(from: Point, to: Point, fallback: Direction): Direction {
  if (to.x > from.x) return 'right';
  if (to.x < from.x) return 'left';
  if (to.y > from.y) return 'down';
  if (to.y < from.y) return 'up';
  return fallback;
}

function nextStep(p: PlayerState, held: Direction | null, walkable: (x: number, y: number) => boolean) {
  if (held) {
    const s = DIR_STEP[held];
    const target = { x: p.to.x + s.x, y: p.to.y + s.y };
    return { target: walkable(target.x, target.y) ? target : null, facing: held, path: [] as Point[] };
  }
  const [target, ...rest] = p.path;
  if (!target || !walkable(target.x, target.y)) return { target: null, facing: p.facing, path: [] as Point[] };
  return { target, facing: facingTo(p.to, target, p.facing), path: rest };
}

/**
 * Avança o jogador `dt` segundos. Tecla segurada manda mais que o caminho do clique.
 * Ao chegar num ladrilho já escolhe o próximo, para o passo não engasgar.
 */
export function stepPlayer(
  p: PlayerState,
  held: Direction | null,
  dt: number,
  walkable: (x: number, y: number) => boolean,
): PlayerState {
  if (isMoving(p)) {
    const progress = p.progress + dt * WALK_SPEED;
    const walked = p.walked + dt * WALK_SPEED;
    if (progress < 1) return { ...p, progress, walked };
    const arrived = { ...p, from: p.to, progress: 1, walked };
    return startNext(arrived, held, walkable, progress - 1);
  }
  return startNext(p, held, walkable, 0);
}

function startNext(p: PlayerState, held: Direction | null, walkable: (x: number, y: number) => boolean, carry: number) {
  const { target, facing, path } = nextStep(p, held, walkable);
  if (!target) return { ...p, facing, path, progress: 1 };
  return { ...p, from: p.to, to: target, facing, path, progress: Math.min(carry, 0.99) };
}

export function withPath(p: PlayerState, path: readonly Point[]): PlayerState {
  return { ...p, path };
}
