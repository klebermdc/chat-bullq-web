import { describe, expect, it } from 'vitest';
import { clampCamera, clampZoom, deviceScale, screenToWorld, worldOrigin } from './camera';

describe('câmera', () => {
  it('escala sempre inteira, considerando a densidade da tela', () => {
    expect(deviceScale(2, 1)).toBe(2);
    expect(deviceScale(2, 2)).toBe(4);
    expect(deviceScale(3, 1.5)).toBe(5);
    expect(deviceScale(1, 0.4)).toBe(1);
  });

  it('zoom fica entre 1 e 5', () => {
    expect(clampZoom(0)).toBe(1);
    expect(clampZoom(9)).toBe(5);
    expect(clampZoom(2.4)).toBe(2);
  });

  it('prende a câmera dentro do mapa', () => {
    const view = { w: 400, h: 200 };
    const world = { w: 1000, h: 1000 };
    expect(clampCamera({ x: 0, y: 0 }, view, 2, world)).toEqual({ x: 100, y: 50 });
    expect(clampCamera({ x: 5000, y: 5000 }, view, 2, world)).toEqual({ x: 900, y: 950 });
    expect(clampCamera({ x: 500, y: 500 }, view, 2, world)).toEqual({ x: 500, y: 500 });
  });

  it('centraliza quando o mapa cabe inteiro', () => {
    expect(clampCamera({ x: 0, y: 0 }, { w: 1000, h: 1000 }, 2, { w: 300, h: 100 })).toEqual({ x: 150, y: 50 });
  });

  it('converte tela em mundo e volta', () => {
    const view = { w: 400, h: 300 };
    const center = { x: 100, y: 80 };
    expect(worldOrigin(center, view, 2)).toEqual({ x: 0, y: -10 });
    expect(screenToWorld({ x: 200, y: 150 }, center, view, 2)).toEqual({ x: 100, y: 80 });
  });
});
