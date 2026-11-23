import { T, TILE, type WorldLayout } from '../types';
import { CARPETS, P } from './palette';
import { noise, rect, type Ctx } from './pixels';

type L = Pick<WorldLayout, 'width' | 'height' | 'tiles'>;

const tileAt = (l: L, x: number, y: number) =>
  x < 0 || y < 0 || x >= l.width || y >= l.height ? T.GRASS : l.tiles[y * l.width + x];
const isWallLike = (k: number) => k === T.WALL;

function grass(ctx: Ctx, px: number, py: number, tx: number, ty: number) {
  rect(ctx, px, py, TILE, TILE, P.grass);
  for (let i = 0; i < 10; i++) {
    const x = Math.floor(noise(tx, ty, i) * TILE);
    const y = Math.floor(noise(tx, ty, i + 50) * TILE);
    rect(ctx, px + x, py + y, 1, 2, i % 2 ? P.grassDark : P.grassLight);
  }
  if (noise(tx, ty, 99) > 0.86) {
    const x = 3 + Math.floor(noise(tx, ty, 7) * 9);
    const y = 3 + Math.floor(noise(tx, ty, 8) * 9);
    const petal = noise(tx, ty, 9) > 0.5 ? P.flowerA : P.flowerB;
    rect(ctx, px + x - 1, py + y, 3, 1, petal);
    rect(ctx, px + x, py + y - 1, 1, 3, petal);
    rect(ctx, px + x, py + y, 1, 1, P.amber);
  }
}

function wood(ctx: Ctx, px: number, py: number, tx: number, ty: number) {
  rect(ctx, px, py, TILE, TILE, P.wood);
  for (let row = 0; row < 4; row++) {
    const y = py + row * 4;
    rect(ctx, px, y + 3, TILE, 1, P.woodLine);
    rect(ctx, px, y, TILE, 1, P.woodLight);
    const joint = Math.floor(noise(tx, ty * 4 + row, 3) * TILE);
    rect(ctx, px + joint, y, 1, 3, P.woodLine);
  }
}

function checker(ctx: Ctx, px: number, py: number) {
  rect(ctx, px, py, 8, 8, P.checkerA);
  rect(ctx, px + 8, py + 8, 8, 8, P.checkerA);
  rect(ctx, px + 8, py, 8, 8, P.checkerB);
  rect(ctx, px, py + 8, 8, 8, P.checkerB);
  rect(ctx, px, py + 15, TILE, 1, P.grout);
  rect(ctx, px + 15, py, 1, TILE, P.grout);
}

function carpet(ctx: Ctx, px: number, py: number, kind: number) {
  const [base, light] = CARPETS[kind] ?? CARPETS[11];
  rect(ctx, px, py, TILE, TILE, base);
  for (let y = 0; y < TILE; y += 2) {
    for (let x = (y / 2) % 2 === 0 ? 0 : 2; x < TILE; x += 4) rect(ctx, px + x, py + y, 1, 1, light);
  }
}

function path(ctx: Ctx, px: number, py: number, tx: number, ty: number) {
  rect(ctx, px, py, TILE, TILE, P.path);
  for (let i = 0; i < 4; i++) {
    const x = Math.floor(noise(tx, ty, i + 20) * 12);
    const y = Math.floor(noise(tx, ty, i + 30) * 12);
    rect(ctx, px + x, py + y, 4, 3, P.pathDark);
    rect(ctx, px + x, py + y, 3, 2, P.path);
  }
}

const CAP_H = 5;

/** Parede vista de cima com a face da frente aparecendo (quando embaixo dela há chão). */
function wall(ctx: Ctx, l: L, px: number, py: number, tx: number, ty: number) {
  const below = tileAt(l, tx, ty + 1);
  const exterior = below === T.GRASS || below === T.PATH;
  if (isWallLike(below)) {
    rect(ctx, px, py, TILE, TILE, P.wallCap);
    if (!isWallLike(tileAt(l, tx - 1, ty))) rect(ctx, px, py, 1, TILE, P.wallCapLight);
    if (!isWallLike(tileAt(l, tx + 1, ty))) rect(ctx, px + 15, py, 1, TILE, P.wallCapLight);
    if (!isWallLike(tileAt(l, tx, ty - 1))) rect(ctx, px, py, TILE, 1, P.wallCapLight);
    return;
  }
  rect(ctx, px, py, TILE, CAP_H, P.wallCap);
  rect(ctx, px, py, TILE, 1, P.wallCapLight);
  if (exterior) {
    rect(ctx, px, py + CAP_H, TILE, TILE - CAP_H, P.brick);
    for (let y = CAP_H + 2; y < TILE; y += 3) {
      rect(ctx, px, py + y, TILE, 1, P.mortar);
      const off = (y / 3) % 2 === 0 ? 3 : 7;
      for (let x = off; x < TILE; x += 8) rect(ctx, px + x, py + y - 2, 1, 2, P.mortar);
    }
    if (tx % 3 === 0) {
      rect(ctx, px + 3, py + 7, 10, 7, P.outline);
      rect(ctx, px + 4, py + 8, 8, 5, P.glass);
      rect(ctx, px + 4, py + 8, 3, 2, P.glassLight);
      rect(ctx, px + 7, py + 8, 1, 5, P.outline);
    }
    return;
  }
  rect(ctx, px, py + CAP_H, TILE, TILE - CAP_H, P.wallFace);
  rect(ctx, px, py + CAP_H, TILE, 1, P.wallFaceShade);
  for (let x = 2; x < TILE; x += 5) rect(ctx, px + x, py + CAP_H + 2, 1, TILE - CAP_H - 4, P.wallFaceShade);
  rect(ctx, px, py + 13, TILE, 3, P.baseboard);
  if (noise(tx, ty, 77) > 0.82) {
    rect(ctx, px + 4, py + 6, 8, 6, P.outline);
    rect(ctx, px + 5, py + 7, 6, 4, noise(tx, ty, 78) > 0.5 ? P.glass : P.leafLight);
    rect(ctx, px + 5, py + 9, 6, 2, P.leaf);
  }
}

function door(ctx: Ctx, l: L, px: number, py: number, tx: number, ty: number) {
  const below = tileAt(l, tx, ty + 1);
  if (below === T.PATH || below === T.GRASS) checker(ctx, px, py);
  else wood(ctx, px, py, tx, ty);
  rect(ctx, px, py, TILE, 2, P.wallCap);
  if (isWallLike(tileAt(l, tx - 1, ty))) rect(ctx, px, py, 2, TILE, P.furnitureDark);
  if (isWallLike(tileAt(l, tx + 1, ty))) rect(ctx, px + 14, py, 2, TILE, P.furnitureDark);
}

/** Sombra leve no chão encostado numa parede, para dar profundidade. */
function contactShadow(ctx: Ctx, l: L, px: number, py: number, tx: number, ty: number) {
  ctx.fillStyle = 'rgba(30, 20, 40, 0.18)';
  if (isWallLike(tileAt(l, tx, ty - 1))) ctx.fillRect(px, py, TILE, 3);
  if (isWallLike(tileAt(l, tx - 1, ty))) ctx.fillRect(px, py, 2, TILE);
}

export function drawTile(ctx: Ctx, l: L, tx: number, ty: number) {
  const kind = tileAt(l, tx, ty);
  const px = tx * TILE;
  const py = ty * TILE;
  if (kind === T.GRASS) return grass(ctx, px, py, tx, ty);
  if (kind === T.WALL) return wall(ctx, l, px, py, tx, ty);
  if (kind === T.DOOR) return door(ctx, l, px, py, tx, ty);
  if (kind === T.PATH) return path(ctx, px, py, tx, ty);
  if (kind === T.WOOD) wood(ctx, px, py, tx, ty);
  else if (kind === T.CHECKER) checker(ctx, px, py);
  else carpet(ctx, px, py, kind);
  contactShadow(ctx, l, px, py, tx, ty);
}
