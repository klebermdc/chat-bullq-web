import { describe, expect, it } from 'vitest';
import { createEngine, spawnFor, tickEngine } from './engine';
import { buildWorld } from './layout';
import { findPath } from './pathfinding';
import { withPath } from './player';
import { isWalkable, roomKeyAt } from './types';

const view = { w: 800, h: 600 };

describe('engine', () => {
  it('nasce na porta da própria sala; sem sala, na entrada', () => {
    const layout = buildWorld([{ userId: 'me', name: 'Eu', role: 'AGENT' }]);
    const own = spawnFor(layout, 'me');
    expect(roomKeyAt(layout, own.x, own.y)).toBe('me');
    expect(spawnFor(layout, 'outro')).toEqual(layout.spawn);
  });

  it('avisa quando entra numa sala andando', () => {
    const layout = buildWorld([{ userId: 'a', name: 'Ana', role: 'AGENT' }]);
    const room = layout.rooms.find((r) => r.key === 'a')!;
    const goal = { x: room.rect.x + 1, y: room.rect.y + 1 };
    const path = findPath(layout.spawn, goal, (x, y) => isWalkable(layout, x, y))!;
    let e = createEngine(layout.spawn, layout);
    e = { ...e, player: withPath(e.player, path) };
    const entered: string[] = [];
    for (let i = 0; i < 400; i++) {
      const r = tickEngine(e, layout, 0.05, view, 2, false);
      if (r.enteredRoom) entered.push(r.enteredRoom);
      e = r.engine;
    }
    expect(entered.at(-1)).toBe('a');
    expect(e.camera.follow).toBe(true);
  });
});
