'use client';

import { useEffect, type RefObject } from 'react';
import { screenToWorld, type Size } from '../../lib/world/camera';
import { DIR_STEP, isMoving, withPath, type Direction } from '../../lib/world/player';
import { TILE, type Point } from '../../lib/world/types';
import type { Engine } from '../../lib/world/engine';

const KEY_DIR: Record<string, Direction> = {
  ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
  w: 'up', s: 'down', a: 'left', d: 'right', W: 'up', S: 'down', A: 'left', D: 'right',
};

/** Arrastar mais que isso (px de CSS) é mover o mapa, não clicar. */
const DRAG_THRESHOLD = 5;

const isTyping = (t: EventTarget | null) =>
  t instanceof HTMLElement && (t.isContentEditable || ['INPUT', 'SELECT', 'TEXTAREA'].includes(t.tagName));

export interface WorldInputOptions {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  engineRef: RefObject<Engine | null>;
  getView: () => { view: Size; scale: number; dpr: number };
  onTileClick: (tile: Point) => void;
  onZoom: (delta: number) => void;
  onEscape: () => void;
}

export function useWorldInput({ canvasRef, engineRef, getView, onTileClick, onZoom, onEscape }: WorldInputOptions) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const update = (fn: (e: Engine) => Engine) => {
      if (engineRef.current) engineRef.current = fn(engineRef.current);
    };

    const onKeyDown = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape' && !isTyping(ev.target)) return onEscape();
      const dir = KEY_DIR[ev.key];
      const onMap = ev.target === canvas || ev.target === document.body;
      if (!dir || !onMap || ev.metaKey || ev.ctrlKey || ev.altKey) return;
      ev.preventDefault();
      update((e) => {
        if (e.held.includes(dir)) return e;
        // Toque curto (menos de um quadro) ainda anda um ladrilho.
        const step = DIR_STEP[dir];
        const tap = isMoving(e.player) ? e.player : withPath(e.player, [{ x: e.player.to.x + step.x, y: e.player.to.y + step.y }]);
        return { ...e, held: [...e.held, dir], player: tap, camera: { ...e.camera, follow: true } };
      });
    };
    const onKeyUp = (ev: KeyboardEvent) => {
      const dir = KEY_DIR[ev.key];
      if (dir) update((e) => ({ ...e, held: e.held.filter((d) => d !== dir) }));
    };
    const clearKeys = () => update((e) => ({ ...e, held: [] }));

    let drag: { x: number; y: number; cam: Point; moved: boolean; id: number } | null = null;
    const onPointerDown = (ev: PointerEvent) => {
      if (ev.button !== 0 || !engineRef.current) return;
      canvas.focus({ preventScroll: true });
      drag = { x: ev.clientX, y: ev.clientY, cam: engineRef.current.camera.pos, moved: false, id: ev.pointerId };
    };
    const onPointerMove = (ev: PointerEvent) => {
      if (!drag || ev.pointerId !== drag.id) return;
      const dx = ev.clientX - drag.x;
      const dy = ev.clientY - drag.y;
      if (!drag.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
      if (!drag.moved) canvas.setPointerCapture(ev.pointerId);
      drag = { ...drag, moved: true };
      const { scale, dpr } = getView();
      const start = drag.cam;
      update((e) => ({
        ...e,
        camera: { pos: { x: start.x - (dx * dpr) / scale, y: start.y - (dy * dpr) / scale }, follow: false, target: null },
      }));
    };
    const onPointerUp = (ev: PointerEvent) => {
      if (!drag || ev.pointerId !== drag.id) return;
      const wasClick = !drag.moved;
      drag = null;
      if (!wasClick || !engineRef.current) return;
      const { view, scale, dpr } = getView();
      const r = canvas.getBoundingClientRect();
      const screen = { x: (ev.clientX - r.left) * dpr, y: (ev.clientY - r.top) * dpr };
      const w = screenToWorld(screen, engineRef.current.camera.pos, view, scale);
      onTileClick({ x: Math.floor(w.x / TILE), y: Math.floor(w.y / TILE) });
    };
    const onWheel = (ev: WheelEvent) => {
      if (!ev.ctrlKey && !ev.metaKey) return;
      ev.preventDefault();
      onZoom(ev.deltaY < 0 ? 1 : -1);
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', clearKeys);
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerUp);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', clearKeys);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerUp);
      canvas.removeEventListener('wheel', onWheel);
    };
  }, [canvasRef, engineRef, getView, onTileClick, onZoom, onEscape]);
}
