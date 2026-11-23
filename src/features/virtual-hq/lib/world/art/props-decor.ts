import { box } from './props-furniture';
import { P } from './palette';
import { rect, type Ctx } from './pixels';

function leaves(ctx: Ctx, cx: number, top: number, height: number) {
  rect(ctx, cx - 5, top + 3, 10, height - 3, P.leafDark);
  rect(ctx, cx - 6, top + 5, 3, height - 7, P.leaf);
  rect(ctx, cx + 3, top + 4, 3, height - 6, P.leaf);
  rect(ctx, cx - 2, top, 4, height - 2, P.leaf);
  rect(ctx, cx - 1, top + 1, 2, 3, P.leafLight);
  rect(ctx, cx - 5, top + 6, 2, 2, P.leafLight);
  rect(ctx, cx + 3, top + 5, 2, 2, P.leafLight);
}

function pot(ctx: Ctx, px: number, py: number, w: number, h: number) {
  box(ctx, px, py, w, h, P.pot);
  rect(ctx, px, py, w, 2, P.potDark);
}

export function plant(ctx: Ctx, px: number, py: number) {
  leaves(ctx, px + 8, py - 3, 13);
  pot(ctx, px + 4, py + 9, 8, 7);
}

export function bigPlant(ctx: Ctx, px: number, py: number) {
  leaves(ctx, px + 8, py - 12, 20);
  leaves(ctx, px + 5, py - 6, 13);
  leaves(ctx, px + 11, py - 7, 14);
  pot(ctx, px + 3, py + 7, 10, 9);
}

export function tree(ctx: Ctx, px: number, py: number) {
  ctx.fillStyle = 'rgba(20, 40, 20, 0.3)';
  ctx.fillRect(px - 1, py + 12, 18, 4);
  box(ctx, px + 6, py + 4, 5, 12, P.furnitureDark);
  box(ctx, px - 2, py - 14, 21, 20, P.leafDark);
  rect(ctx, px, py - 12, 16, 15, P.leaf);
  rect(ctx, px + 2, py - 14, 10, 4, P.leaf);
  rect(ctx, px + 2, py - 11, 6, 4, P.leafLight);
  rect(ctx, px + 10, py - 6, 4, 3, P.leafLight);
  rect(ctx, px + 1, py - 4, 3, 2, P.leafLight);
}

export function whiteboard(ctx: Ctx, px: number, py: number, w: number) {
  box(ctx, px + 2, py - 14, w - 4, 13, P.paper);
  rect(ctx, px + 5, py - 11, 14, 1, P.water);
  rect(ctx, px + 5, py - 8, 10, 1, P.water);
  rect(ctx, px + 22, py - 11, 1, 7, P.red);
  rect(ctx, px + 22, py - 5, 10, 1, P.red);
  rect(ctx, px + 25, py - 8, 2, 2, P.red);
  rect(ctx, px + 30, py - 10, 2, 4, P.red);
  rect(ctx, px + 4, py - 1, w - 8, 2, P.metal);
}

export function board(ctx: Ctx, px: number, py: number, w: number) {
  box(ctx, px + 2, py - 14, w - 4, 13, '#c9965b');
  const notes = [P.yellow, P.flowerB, P.water, P.leafLight, P.yellow, P.paper];
  notes.forEach((c, i) => rect(ctx, px + 5 + (i % 3) * 8, py - 11 + Math.floor(i / 3) * 5, 5, 4, c));
}

export function server(ctx: Ctx, px: number, py: number) {
  box(ctx, px + 1, py - 13, 14, 29, '#2f3446');
  for (let u = 0; u < 6; u++) {
    const y = py - 11 + u * 4;
    rect(ctx, px + 3, y, 10, 1, '#454b61');
    rect(ctx, px + 4, y + 2, 1, 1, u % 2 ? P.leafLight : P.screenGlow);
  }
}

export function easel(ctx: Ctx, px: number, py: number) {
  rect(ctx, px + 3, py + 2, 1, 14, P.furnitureDark);
  rect(ctx, px + 12, py + 2, 1, 14, P.furnitureDark);
  rect(ctx, px + 8, py + 4, 1, 11, P.furnitureDark);
  box(ctx, px + 1, py - 10, 14, 13, P.paper);
  const bars = [3, 5, 4, 8];
  bars.forEach((h, i) => rect(ctx, px + 3 + i * 3, py + 1 - h, 2, h, i === 3 ? P.red : P.water));
}

export function cooler(ctx: Ctx, px: number, py: number) {
  box(ctx, px + 5, py - 9, 7, 8, P.water);
  rect(ctx, px + 6, py - 8, 2, 4, '#bfe6fa');
  box(ctx, px + 3, py - 2, 11, 18, P.metalLight);
  rect(ctx, px + 7, py + 3, 3, 2, P.red);
}

export function boxes(ctx: Ctx, px: number, py: number) {
  box(ctx, px + 1, py + 4, 14, 12, P.cardboard);
  rect(ctx, px + 7, py + 5, 2, 10, P.cardboardDark);
  box(ctx, px + 3, py - 4, 10, 9, P.cardboard);
  rect(ctx, px + 7, py - 3, 2, 7, P.cardboardDark);
}
