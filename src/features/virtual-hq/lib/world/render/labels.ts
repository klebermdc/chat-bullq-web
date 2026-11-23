import type { SceneRoom } from '../scene';
import { TILE, type Point, type WorldLayout } from '../types';

const PRESENCE_DOT = { online: '#3ccf7a', away: '#f5b02e', offline: '#9a96a8' } as const;

export interface LabelView {
  origin: Point;
  scale: number;
  dpr: number;
}

type PlateStyle = 'name' | 'sign' | 'room' | 'count' | 'you';

const STYLE: Record<PlateStyle, { bg: string; fg: string; border: string; size: number; weight: number }> = {
  name: { bg: 'rgba(28,22,40,0.86)', fg: '#ffffff', border: '#120e1a', size: 11, weight: 600 },
  you: { bg: '#ffd84a', fg: '#2a2233', border: '#2a2233', size: 11, weight: 700 },
  sign: { bg: '#c08a55', fg: '#2a1a0e', border: '#6f4a2b', size: 11, weight: 800 },
  room: { bg: 'rgba(75,61,94,0.92)', fg: '#ffffff', border: '#2a2233', size: 11, weight: 700 },
  count: { bg: '#ffffff', fg: '#2a2233', border: '#2a2233', size: 10, weight: 800 },
};

/** Plaquinha com texto nítido, desenhada em pixels de tela (não escala com o zoom). */
function plate(
  ctx: CanvasRenderingContext2D,
  v: LabelView,
  world: Point,
  text: string,
  style: PlateStyle,
  opts: { dot?: string; align?: 'center' | 'left'; dim?: boolean } = {},
) {
  const s = STYLE[style];
  const d = v.dpr;
  ctx.font = `${s.weight} ${Math.round(s.size * d)}px ui-sans-serif, system-ui, sans-serif`;
  const dotW = opts.dot ? Math.round(9 * d) : 0;
  const padX = Math.round(5 * d);
  const w = Math.round(ctx.measureText(text).width) + padX * 2 + dotW;
  const h = Math.round((s.size + 7) * d);
  const sx = Math.round(v.origin.x + world.x * v.scale);
  const sy = Math.round(v.origin.y + world.y * v.scale);
  const x = opts.align === 'left' ? sx : sx - Math.round(w / 2);
  const y = sy - h;
  ctx.globalAlpha = opts.dim ? 0.75 : 1;
  ctx.fillStyle = s.border;
  ctx.fillRect(x - d, y - d, w + 2 * d, h + 2 * d);
  ctx.fillStyle = s.bg;
  ctx.fillRect(x, y, w, h);
  if (opts.dot) {
    ctx.fillStyle = opts.dot;
    ctx.fillRect(x + padX, y + Math.round(h / 2 - 3 * d), Math.round(6 * d), Math.round(6 * d));
  }
  ctx.fillStyle = s.fg;
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + padX + dotW, y + Math.round(h / 2 + d / 2));
  ctx.globalAlpha = 1;
}

/** Nomes, placas das alas, títulos das áreas e o "+N" de clientes. */
export function drawLabels(
  ctx: CanvasRenderingContext2D,
  v: LabelView,
  layout: WorldLayout,
  scene: readonly SceneRoom[],
  player: { at: Point; label: string } | null,
) {
  const sceneBy = new Map(scene.map((s) => [s.key, s]));
  for (const sign of layout.signs) {
    plate(ctx, v, { x: sign.x * TILE + 2, y: sign.y * TILE + 13 }, sign.label.toUpperCase(), 'sign', { align: 'left' });
  }
  for (const room of layout.rooms) {
    const s = sceneBy.get(room.key);
    if (room.kind !== 'person') {
      const x = room.kind === 'reception' ? (room.rect.x + 3) * TILE : (room.rect.x + room.rect.w / 2) * TILE;
      plate(ctx, v, { x, y: room.rect.y * TILE - 3 }, room.title, 'room');
    }
    if (s && s.overflow > 0) {
      plate(ctx, v, { x: (room.overflowAt.x + 0.5) * TILE, y: (room.overflowAt.y + 0.8) * TILE }, `+${s.overflow}`, 'count');
    }
    if (!s?.person || !room.seat || s.person.isPlayer) continue;
    const p = s.person;
    const text = p.presence === 'away' ? `${p.shortName} · ausente` : p.presence === 'offline' ? `${p.shortName} · fora` : p.shortName;
    plate(ctx, v, { x: (room.seat.x + 0.5) * TILE, y: room.seat.y * TILE - 5 }, text, 'name', {
      dot: PRESENCE_DOT[p.presence],
      dim: p.presence === 'offline',
    });
  }
  if (player) plate(ctx, v, { x: (player.at.x + 0.5) * TILE, y: player.at.y * TILE - 6 }, player.label, 'you');
}
