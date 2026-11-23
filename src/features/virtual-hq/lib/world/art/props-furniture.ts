import { P } from './palette';
import { lighten, noise, rect, type Ctx } from './pixels';

/** Contorno + miolo, o jeito de toda peça ficar "pixel art". */
export function box(ctx: Ctx, x: number, y: number, w: number, h: number, fill: string) {
  rect(ctx, x, y, w, h, P.outline);
  rect(ctx, x + 1, y + 1, w - 2, h - 2, fill);
}

function shadow(ctx: Ctx, x: number, y: number, w: number, h: number) {
  ctx.fillStyle = 'rgba(30, 20, 40, 0.22)';
  ctx.fillRect(x, y, w, h);
}

export function desk(ctx: Ctx, px: number, py: number, w: number) {
  shadow(ctx, px + 1, py + 14, w - 2, 2);
  box(ctx, px, py - 4, w, 11, P.furnitureLight);
  rect(ctx, px + 1, py - 3, w - 2, 1, lighten(P.furnitureLight, 0.25));
  box(ctx, px, py + 6, w, 9, P.furniture);
  for (let i = 0; i < w / 16; i++) rect(ctx, px + i * 16 + 6, py + 9, 4, 1, P.furnitureDark);
  // monitor visto por trás, teclado e papéis
  box(ctx, px + 3, py - 13, 11, 9, P.metalDark);
  rect(ctx, px + 4, py - 12, 9, 1, P.metal);
  rect(ctx, px + 7, py - 5, 3, 2, P.metalDark);
  box(ctx, px + 18, py - 2, 12, 4, P.metalLight);
  for (let k = 0; k < 4; k++) rect(ctx, px + 20 + k * 2, py - 1, 1, 1, P.metalDark);
  if (w >= 48) {
    rect(ctx, px + w - 14, py - 2, 7, 5, P.paper);
    rect(ctx, px + w - 13, py - 1, 5, 1, P.metal);
    box(ctx, px + w - 6, py - 3, 4, 5, P.red);
  }
}

export function chair(ctx: Ctx, px: number, py: number) {
  box(ctx, px + 2, py - 2, 12, 11, P.chair);
  rect(ctx, px + 4, py, 8, 1, P.chairLight);
  box(ctx, px + 2, py + 8, 12, 5, P.chairLight);
  rect(ctx, px + 7, py + 13, 2, 2, P.metalDark);
  rect(ctx, px + 4, py + 15, 8, 1, P.outline);
}

export function stool(ctx: Ctx, px: number, py: number) {
  shadow(ctx, px + 4, py + 13, 8, 2);
  rect(ctx, px + 5, py + 10, 1, 4, P.metalDark);
  rect(ctx, px + 10, py + 10, 1, 4, P.metalDark);
  box(ctx, px + 3, py + 4, 10, 7, P.chairLight);
  rect(ctx, px + 4, py + 5, 8, 1, lighten(P.chairLight, 0.2));
}

export function table(ctx: Ctx, px: number, py: number, w: number, h: number) {
  shadow(ctx, px + 2, py + h - 2, w - 4, 2);
  box(ctx, px + 1, py - 3, w - 2, h - 2, P.furnitureLight);
  rect(ctx, px + 2, py - 2, w - 4, 1, lighten(P.furnitureLight, 0.25));
  rect(ctx, px + 2, py + h - 8, w - 4, 3, P.furniture);
  rect(ctx, px + 3, py + h - 5, 2, 3, P.furnitureDark);
  rect(ctx, px + w - 5, py + h - 5, 2, 3, P.furnitureDark);
  rect(ctx, px + 8, py + 2, 8, 6, P.paper);
  rect(ctx, px + 9, py + 3, 6, 1, P.metal);
  rect(ctx, px + w - 18, py + 6, 9, 6, P.paper);
  box(ctx, px + w / 2 - 3, py + 4, 6, 6, P.pot);
  rect(ctx, px + w / 2 - 2, py + 1, 4, 3, P.leafLight);
}

export function counter(ctx: Ctx, px: number, py: number, w: number) {
  shadow(ctx, px + 1, py + 14, w - 2, 2);
  box(ctx, px, py - 5, w, 8, P.furnitureLight);
  rect(ctx, px + 1, py - 4, w - 2, 1, lighten(P.furnitureLight, 0.25));
  box(ctx, px, py + 2, w, 13, P.counter);
  rect(ctx, px + 1, py + 5, w - 2, 2, P.counterLight);
  // globo no meio do balcão
  const gx = px + w / 2 - 4;
  box(ctx, gx, py + 7, 8, 7, P.water);
  rect(ctx, gx + 2, py + 8, 3, 2, P.leafLight);
  rect(ctx, gx + 4, py + 11, 2, 2, P.leafLight);
  box(ctx, px + 10, py - 13, 11, 9, P.metalDark);
  rect(ctx, px + w - 14, py - 6, 5, 2, P.amber);
  rect(ctx, px + w - 13, py - 8, 3, 2, P.amber);
}

export function sofa(ctx: Ctx, px: number, py: number, w: number) {
  shadow(ctx, px + 1, py + 14, w - 2, 2);
  box(ctx, px, py - 3, w, 10, P.sofa);
  rect(ctx, px + 1, py - 2, w - 2, 1, P.sofaLight);
  box(ctx, px, py + 6, w, 9, P.sofaLight);
  for (let i = 1; i < w / 16; i++) rect(ctx, px + i * 16, py + 7, 1, 7, P.sofa);
  box(ctx, px, py + 2, 4, 13, P.sofa);
  box(ctx, px + w - 4, py + 2, 4, 13, P.sofa);
}

export function rug(ctx: Ctx, px: number, py: number, w: number, h: number) {
  rect(ctx, px + 2, py + 2, w - 4, h - 4, P.rug);
  rect(ctx, px + 4, py + 4, w - 8, 1, P.rugLight);
  rect(ctx, px + 4, py + h - 5, w - 8, 1, P.rugLight);
  rect(ctx, px + 4, py + 4, 1, h - 8, P.rugLight);
  rect(ctx, px + w - 5, py + 4, 1, h - 8, P.rugLight);
  for (let x = px + 10; x < px + w - 10; x += 8) {
    rect(ctx, x, py + h / 2 - 1, 3, 3, P.rugLight);
  }
}

export function shelf(ctx: Ctx, px: number, py: number, w: number) {
  box(ctx, px + 1, py - 11, w - 2, 26, P.furnitureDark);
  const books = [P.red, P.water, P.amber, P.leaf, P.counterLight, P.paper, P.sofa];
  for (let s = 0; s < 3; s++) {
    const sy = py - 9 + s * 8;
    rect(ctx, px + 2, sy + 6, w - 4, 1, P.furnitureLight);
    for (let x = px + 3, i = 0; x < px + w - 4; i++) {
      const bw = noise(px + i, sy, 4) > 0.5 ? 2 : 3;
      const bh = 4 + Math.floor(noise(px + i, sy, 5) * 3);
      rect(ctx, x, sy + 6 - bh, bw, bh, books[Math.floor(noise(px + i, sy, 6) * books.length)]);
      x += bw + (noise(px + i, sy, 8) > 0.8 ? 2 : 0);
    }
  }
}

export function cabinet(ctx: Ctx, px: number, py: number) {
  box(ctx, px + 2, py - 6, 12, 22, P.metal);
  for (let d = 0; d < 3; d++) {
    rect(ctx, px + 3, py - 5 + d * 7, 10, 1, P.metalLight);
    rect(ctx, px + 6, py - 2 + d * 7, 4, 1, P.metalDark);
  }
}

export function safe(ctx: Ctx, px: number, py: number) {
  box(ctx, px + 1, py - 4, 14, 20, P.metalDark);
  box(ctx, px + 3, py - 2, 10, 15, P.metal);
  box(ctx, px + 6, py + 3, 5, 5, P.metalLight);
  rect(ctx, px + 8, py + 4, 1, 2, P.outline);
  rect(ctx, px + 11, py + 1, 1, 6, P.amber);
}
