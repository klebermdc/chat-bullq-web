import { describe, expect, it } from 'vitest';
import { findPath } from './pathfinding';

/** '#' parede, '.' livre. */
function gridOf(rows: string[]) {
  return (x: number, y: number) => y >= 0 && y < rows.length && x >= 0 && x < rows[y].length && rows[y][x] === '.';
}

describe('findPath', () => {
  it('acha o caminho mais curto contornando a parede', () => {
    const walk = gridOf(['.....', '.###.', '.....']);
    const path = findPath({ x: 0, y: 1 }, { x: 4, y: 1 }, walk);
    expect(path).not.toBeNull();
    expect(path).toHaveLength(6);
    expect(path!.at(-1)).toEqual({ x: 4, y: 1 });
    expect(path!.every((p) => walk(p.x, p.y))).toBe(true);
  });

  it('devolve nulo quando está bloqueado', () => {
    const walk = gridOf(['..#..', '..#..', '..#..']);
    expect(findPath({ x: 0, y: 0 }, { x: 4, y: 0 }, walk)).toBeNull();
  });

  it('destino em cima de um móvel para do lado dele', () => {
    const walk = gridOf(['.....', '..#..', '.....']);
    const path = findPath({ x: 0, y: 1 }, { x: 2, y: 1 }, walk);
    expect(path!.at(-1)).toEqual({ x: 1, y: 1 });
  });

  it('já no destino, caminho vazio', () => {
    const walk = gridOf(['...']);
    expect(findPath({ x: 1, y: 0 }, { x: 1, y: 0 }, walk)).toEqual([]);
  });
});
