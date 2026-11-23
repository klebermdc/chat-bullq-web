'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { clampZoom, DEFAULT_ZOOM, deviceScale } from '../../lib/world/camera';
import type { AvatarLook } from '../../lib/world/color-hash';
import { createEngine, spawnFor, tickEngine, tileCenter, type Engine } from '../../lib/world/engine';
import { findPath } from '../../lib/world/pathfinding';
import { withPath } from '../../lib/world/player';
import { renderFrame } from '../../lib/world/render/frame';
import { renderStaticLayers, type StaticLayers } from '../../lib/world/render/static-layers';
import type { SceneRoom } from '../../lib/world/scene';
import { isWalkable, roomKeyAt, type Point, type WorldLayout } from '../../lib/world/types';
import { useElementSize } from './use-element-size';
import { useGameLoop } from './use-game-loop';
import { useReducedMotion } from './use-reduced-motion';
import { useWorldInput } from './use-world-input';
import { ZoomControls } from './zoom-controls';

export interface WorldCanvasProps {
  layout: WorldLayout;
  scene: readonly SceneRoom[];
  player: { id: string | null; look: AvatarLook };
  selectedKey: string | null;
  /** Pedido para a câmera ir até uma sala (lista de salas). */
  focus: { key: string; nonce: number } | null;
  onSelectRoom: (key: string) => void;
  onClose: () => void;
  ariaLabel: string;
}

/** O mapa jogável: um canvas, um laço de animação e a câmera seguindo o jogador. */
export function WorldCanvas({ layout, scene, player, selectedKey, focus, onSelectRoom, onClose, ariaLabel }: WorldCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const layersRef = useRef<{ layout: WorldLayout; layers: StaticLayers } | null>(null);
  const live = useRef({ scene, selectedKey, player, onSelectRoom, onClose });
  const size = useElementSize(containerRef);
  const reducedMotion = useReducedMotion();
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);

  useLayoutEffect(() => {
    live.current = { scene, selectedKey, player, onSelectRoom, onClose };
  });

  // Mapa novo (gente entrou/saiu): redesenha o fundo e só reposiciona o jogador se ele ficou num lugar inválido.
  useEffect(() => {
    layersRef.current = { layout, layers: renderStaticLayers(layout) };
    const e = engineRef.current;
    const at = e?.player.to;
    if (!e || !at || !isWalkable(layout, at.x, at.y)) {
      engineRef.current = createEngine(spawnFor(layout, live.current.player.id), layout);
    }
  }, [layout]);

  useEffect(() => {
    if (!focus || !engineRef.current) return;
    const room = layout.rooms.find((r) => r.key === focus.key);
    if (!room) return;
    const target = tileCenter({ x: room.rect.x + (room.rect.w - 1) / 2, y: room.rect.y + (room.rect.h - 1) / 2 });
    engineRef.current = { ...engineRef.current, camera: { ...engineRef.current.camera, follow: false, target } };
  }, [focus, layout]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !size.width) return;
    canvas.width = Math.round(size.width * size.dpr);
    canvas.height = Math.round(size.height * size.dpr);
  }, [size]);

  const getView = useCallback(() => {
    const c = canvasRef.current;
    return { view: { w: c?.width ?? 1, h: c?.height ?? 1 }, scale: deviceScale(zoom, size.dpr), dpr: size.dpr };
  }, [zoom, size.dpr]);

  const onTileClick = useCallback(
    (tile: Point) => {
      const e = engineRef.current;
      if (!e) return;
      const key = roomKeyAt(layout, tile.x, tile.y);
      if (key) live.current.onSelectRoom(key);
      const path = findPath(e.player.to, tile, (x, y) => isWalkable(layout, x, y));
      if (path) engineRef.current = { ...e, player: withPath(e.player, path), camera: { ...e.camera, follow: true } };
    },
    [layout],
  );

  const changeZoom = useCallback((delta: number) => setZoom((z) => clampZoom(z + delta)), []);
  const onEscape = useCallback(() => live.current.onClose(), []);
  const recenter = useCallback(() => {
    if (engineRef.current) engineRef.current = { ...engineRef.current, camera: { ...engineRef.current.camera, follow: true } };
    canvasRef.current?.focus({ preventScroll: true });
  }, []);

  useWorldInput({ canvasRef, engineRef, getView, onTileClick, onZoom: changeZoom, onEscape });

  useGameLoop((dt, time) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const e = engineRef.current;
    const statics = layersRef.current;
    if (!canvas || !ctx || !e || !statics || statics.layout !== layout || canvas.width === 0) return;
    const { view, scale, dpr } = getView();
    const { engine, enteredRoom } = tickEngine(e, layout, dt, view, scale, !reducedMotion);
    engineRef.current = engine;
    if (enteredRoom) live.current.onSelectRoom(enteredRoom);
    renderFrame(ctx, {
      layers: statics.layers,
      layout,
      scene: live.current.scene,
      player: { state: engine.player, look: live.current.player.look },
      camera: engine.camera.pos,
      view,
      scale,
      dpr,
      time: reducedMotion ? 0 : time,
      animate: !reducedMotion,
      selectedKey: live.current.selectedKey,
    });
  });

  return (
    <div
      ref={containerRef}
      className="relative h-[min(68vh,640px)] min-h-[360px] w-full overflow-hidden rounded-lg border bg-[#2d4f33]"
    >
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={ariaLabel}
        tabIndex={0}
        className="block h-full w-full cursor-pointer touch-none outline-none [image-rendering:pixelated] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
      />
      <ZoomControls zoom={zoom} onZoom={changeZoom} onRecenter={recenter} />
      <p className="pointer-events-none absolute bottom-2 left-2 rounded bg-black/55 px-2 py-1 text-[11px] text-white">
        Setas ou WASD para andar · clique para ir · arraste para mover · Ctrl + roda para zoom · Esc fecha
      </p>
    </div>
  );
}

