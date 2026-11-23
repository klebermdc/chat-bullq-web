import { describe, expect, it } from 'vitest';
import { idlePlayer, isMoving, playerPosition, stepPlayer, withPath } from './player';

const open = () => true;
const wallRight = (x: number) => x < 1;

describe('stepPlayer', () => {
  it('anda com a tecla segurada e chega no próximo ladrilho', () => {
    let p = stepPlayer(idlePlayer({ x: 0, y: 0 }), 'right', 0, open);
    expect(p.to).toEqual({ x: 1, y: 0 });
    expect(p.facing).toBe('right');
    p = stepPlayer(p, null, 0.1, open);
    expect(playerPosition(p).x).toBeCloseTo(0.6);
    p = stepPlayer(p, null, 0.2, open);
    expect(isMoving(p)).toBe(false);
    expect(playerPosition(p)).toEqual({ x: 1, y: 0 });
  });

  it('não entra em parede, mas vira o rosto', () => {
    const p = stepPlayer(idlePlayer({ x: 0, y: 0 }), 'right', 0.1, wallRight);
    expect(isMoving(p)).toBe(false);
    expect(p.facing).toBe('right');
  });

  it('segue o caminho do clique', () => {
    let p = withPath(idlePlayer({ x: 0, y: 0 }), [{ x: 0, y: 1 }, { x: 0, y: 2 }]);
    for (let i = 0; i < 10; i++) p = stepPlayer(p, null, 0.1, open);
    expect(playerPosition(p)).toEqual({ x: 0, y: 2 });
    expect(p.path).toHaveLength(0);
  });

  it('tecla cancela o caminho do clique', () => {
    const p = stepPlayer(withPath(idlePlayer({ x: 0, y: 0 }), [{ x: 0, y: 1 }]), 'right', 0, open);
    expect(p.to).toEqual({ x: 1, y: 0 });
    expect(p.path).toEqual([]);
  });
});
