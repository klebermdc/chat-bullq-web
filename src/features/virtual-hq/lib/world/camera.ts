import type { Point } from './types';

export const MIN_ZOOM = 1;
export const MAX_ZOOM = 5;
export const DEFAULT_ZOOM = 2;

export interface Size {
  w: number;
  h: number;
}

/** Pixels de tela (físicos) por pixel do mundo: sempre inteiro, para o pixel ficar nítido. */
export function deviceScale(zoom: number, dpr: number): number {
  return Math.max(1, Math.round(zoom * (dpr > 0 ? dpr : 1)));
}

export function clampZoom(zoom: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(zoom)));
}

function clampAxis(center: number, view: number, world: number): number {
  if (world <= view) return world / 2;
  return Math.min(world - view / 2, Math.max(view / 2, center));
}

/**
 * Centro da câmera (em pixels do mundo) preso dentro do mapa. Se o mapa couber
 * inteiro na tela, fica centralizado.
 */
export function clampCamera(center: Point, viewDevice: Size, scale: number, worldPx: Size): Point {
  return {
    x: clampAxis(center.x, viewDevice.w / scale, worldPx.w),
    y: clampAxis(center.y, viewDevice.h / scale, worldPx.h),
  };
}

/** Canto superior esquerdo do mundo na tela, arredondado para pixel inteiro. */
export function worldOrigin(center: Point, viewDevice: Size, scale: number): Point {
  return {
    x: Math.round(viewDevice.w / 2 - center.x * scale),
    y: Math.round(viewDevice.h / 2 - center.y * scale),
  };
}

export function screenToWorld(screen: Point, center: Point, viewDevice: Size, scale: number): Point {
  const o = worldOrigin(center, viewDevice, scale);
  return { x: (screen.x - o.x) / scale, y: (screen.y - o.y) / scale };
}
