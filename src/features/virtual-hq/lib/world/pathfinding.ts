import type { Point } from './types';

export type WalkableFn = (x: number, y: number) => boolean;

const STEPS: readonly Point[] = [
  { x: 0, y: -1 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
];

/** Limite de busca: o mapa nunca passa disso, e evita travar com dado estranho. */
const MAX_VISITED = 20_000;

/**
 * Caminho mais curto (BFS, 4 direções) de `start` até `goal`, sem incluir o início.
 * Se o destino for móvel/parede, para no vizinho livre mais perto (clicar numa mesa
 * leva até a frente dela). Nulo quando não há caminho.
 */
export function findPath(start: Point, goal: Point, walkable: WalkableFn): Point[] | null {
  const goalFree = walkable(goal.x, goal.y);
  const isTarget = (x: number, y: number) =>
    goalFree ? x === goal.x && y === goal.y : Math.abs(x - goal.x) + Math.abs(y - goal.y) === 1;
  if (isTarget(start.x, start.y)) return [];

  const key = (x: number, y: number) => `${x},${y}`;
  const cameFrom = new Map<string, string | null>([[key(start.x, start.y), null]]);
  const queue: Point[] = [start];
  for (let head = 0; head < queue.length && cameFrom.size < MAX_VISITED; head++) {
    const cur = queue[head];
    for (const s of STEPS) {
      const nx = cur.x + s.x;
      const ny = cur.y + s.y;
      const k = key(nx, ny);
      if (cameFrom.has(k) || !walkable(nx, ny)) continue;
      cameFrom.set(k, key(cur.x, cur.y));
      if (isTarget(nx, ny)) return rebuild(cameFrom, k);
      queue.push({ x: nx, y: ny });
    }
  }
  return null;
}

function rebuild(cameFrom: Map<string, string | null>, end: string): Point[] {
  const path: Point[] = [];
  for (let k: string | null = end; k !== null; k = cameFrom.get(k) ?? null) {
    const [x, y] = k.split(',').map(Number);
    path.push({ x, y });
  }
  return path.reverse().slice(1);
}
