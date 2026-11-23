import type { IntentLevel, RoomAlert } from '../../../api';
import {
  alertBubbleSprite, characterSprite, robotSprite, sleepBubbleSprite, suitcaseSprite, visitorSprite,
} from '../art/characters';
import { P } from '../art/palette';
import { worldOrigin, type Size } from '../camera';
import type { AvatarLook } from '../color-hash';
import type { PlayerState } from '../player';
import { isMoving, playerPosition } from '../player';
import type { SceneRoom } from '../scene';
import { TILE, type Point, type WorldLayout } from '../types';
import { drawLabels } from './labels';

/** Marca no chão sob o cliente pela nota de intenção; frio fica sem marca. */
const HEAT_RING: Record<IntentLevel, string | null> = {
  hot: 'rgba(239,68,68,0.85)',
  warm: 'rgba(245,176,46,0.75)',
  cold: null,
};
import type { StaticLayers } from './static-layers';

export interface FrameInput {
  layers: StaticLayers;
  layout: WorldLayout;
  scene: readonly SceneRoom[];
  player: { state: PlayerState; look: AvatarLook } | null;
  camera: Point;
  view: Size;
  scale: number;
  dpr: number;
  /** Milissegundos desde o início; parado quando o usuário pede menos movimento. */
  time: number;
  animate: boolean;
  selectedKey: string | null;
}

const ALERT_RGB: Record<Exclude<RoomAlert, 'calm'>, string> = { attention: '245,176,46', alert: '229,72,77' };
const SUITCASES = [P.red, P.sofa, P.counterLight, P.water];

interface Standing {
  y: number;
  draw: () => void;
}

function drawRoomGlows(ctx: CanvasRenderingContext2D, f: FrameInput) {
  const sceneBy = new Map(f.scene.map((s) => [s.key, s]));
  for (const room of f.layout.rooms) {
    const alert = sceneBy.get(room.key)?.alert ?? 'calm';
    const { x, y, w, h } = room.rect;
    const rx = x * TILE;
    const ry = y * TILE;
    if (alert !== 'calm') {
      const pulse = f.animate ? 0.55 + 0.35 * Math.sin(f.time / 280) : 0.75;
      const rgb = ALERT_RGB[alert];
      ctx.fillStyle = `rgba(${rgb},${alert === 'alert' ? 0.16 : 0.1})`;
      ctx.fillRect(rx, ry, w * TILE, h * TILE);
      ctx.strokeStyle = `rgba(${rgb},${pulse})`;
      ctx.lineWidth = 2;
      ctx.strokeRect(rx + 1, ry + 1, w * TILE - 2, h * TILE - 2);
    }
    if (room.key === f.selectedKey) {
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 2]);
      ctx.strokeRect(rx + 3.5, ry + 3.5, w * TILE - 7, h * TILE - 7);
      ctx.setLineDash([]);
    }
  }
}

function drawSeated(ctx: CanvasRenderingContext2D, f: FrameInput) {
  f.layout.rooms.forEach((room, i) => {
    const s = f.scene[i];
    if (!room.seat || !s || s.key !== room.key) return;
    const x = room.seat.x * TILE;
    const y = room.seat.y * TILE;
    if (s.robot) {
      const blink = f.animate ? Math.floor(f.time / 600 + i) % 2 === 0 : true;
      ctx.drawImage(robotSprite(blink), x + 1, y - 3);
      return;
    }
    const p = s.person;
    if (!p || p.isPlayer || p.presence === 'offline') return;
    const bob = f.animate && p.presence === 'online' ? Math.floor(f.time / 260 + i * 1.7) % 2 : 0;
    ctx.drawImage(characterSprite(p.look, 'down', 0), x, y - 2 + bob);
  });
}

function collectStanding(ctx: CanvasRenderingContext2D, f: FrameInput): Standing[] {
  const out: Standing[] = [];
  f.scene.forEach((s, i) => {
    s.visitors.forEach((v, j) => {
      const x = v.at.x * TILE + 3;
      const y = v.at.y * TILE + 2;
      out.push({
        y: v.at.y,
        draw: () => {
          const ring = v.heat ? HEAT_RING[v.heat] : null;
          if (ring) {
            ctx.fillStyle = ring;
            // Sprite do cliente tem 10×14 px: elipse de 3 linhas sob os pés.
            ctx.fillRect(x + 1, y + 12, 8, 1);
            ctx.fillRect(x - 1, y + 13, 12, 1);
            ctx.fillRect(x + 1, y + 14, 8, 1);
          }
          ctx.drawImage(visitorSprite(v.look), x, y);
          if (v.suitcase) ctx.drawImage(suitcaseSprite(SUITCASES[(i + j) % SUITCASES.length]), x + 9, y + 7);
        },
      });
    });
  });
  if (f.player) {
    const { state, look } = f.player;
    const pos = playerPosition(state);
    const frame = isMoving(state) ? (Math.floor(state.walked * 2) % 2 === 0 ? 1 : 2) : 0;
    const x = Math.round(pos.x * TILE);
    const y = Math.round(pos.y * TILE);
    out.push({
      y: pos.y,
      draw: () => {
        ctx.fillStyle = 'rgba(255,216,74,0.55)';
        ctx.fillRect(x + 2, y + 14, 12, 2);
        ctx.fillRect(x + 4, y + 13, 8, 1);
        ctx.drawImage(characterSprite(look, state.facing, frame as 0 | 1 | 2), x, y - 3);
      },
    });
  }
  return out.sort((a, b) => a.y - b.y);
}

function drawBubbles(ctx: CanvasRenderingContext2D, f: FrameInput) {
  const float = f.animate ? Math.round(Math.sin(f.time / 220)) : 0;
  f.layout.rooms.forEach((room, i) => {
    const s = f.scene[i];
    if (!s || s.key !== room.key) return;
    s.visitors.filter((v) => v.waiting).forEach((v) => {
      ctx.drawImage(alertBubbleSprite(), v.at.x * TILE + 4, v.at.y * TILE - 10 + float);
    });
    if (room.seat && s.person?.presence === 'away' && !s.person.isPlayer) {
      ctx.drawImage(sleepBubbleSprite(), room.seat.x * TILE + 13, room.seat.y * TILE - 4 - float);
    }
  });
}

/** Um quadro: fundo pronto, gente, bolhas e por fim os textos em pixels de tela. */
export function renderFrame(ctx: CanvasRenderingContext2D, f: FrameInput) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = P.bg;
  ctx.fillRect(0, 0, f.view.w, f.view.h);
  const origin = worldOrigin(f.camera, f.view, f.scale);
  ctx.setTransform(f.scale, 0, 0, f.scale, origin.x, origin.y);
  ctx.drawImage(f.layers.under, 0, 0);
  drawRoomGlows(ctx, f);
  drawSeated(ctx, f);
  ctx.drawImage(f.layers.over, 0, 0);
  collectStanding(ctx, f).forEach((s) => s.draw());
  drawBubbles(ctx, f);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const playerAt = f.player ? playerPosition(f.player.state) : null;
  drawLabels(ctx, { origin, scale: f.scale, dpr: f.dpr }, f.layout, f.scene, playerAt ? { at: playerAt, label: 'Você' } : null);
}
