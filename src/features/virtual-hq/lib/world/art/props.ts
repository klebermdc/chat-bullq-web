import { TILE, type Prop } from '../types';
import * as decor from './props-decor';
import * as furniture from './props-furniture';
import type { Ctx } from './pixels';

/** Desenha um móvel na posição dele (em pixels do mundo). */
export function drawProp(ctx: Ctx, prop: Prop) {
  const px = prop.x * TILE;
  const py = prop.y * TILE;
  const w = prop.w * TILE;
  const h = prop.h * TILE;
  switch (prop.kind) {
    case 'desk': return furniture.desk(ctx, px, py, w);
    case 'chair': return furniture.chair(ctx, px, py);
    case 'stool': return furniture.stool(ctx, px, py);
    case 'table': return furniture.table(ctx, px, py, w, h);
    case 'counter': return furniture.counter(ctx, px, py, w);
    case 'sofa': return furniture.sofa(ctx, px, py, w);
    case 'rug': return furniture.rug(ctx, px, py, w, h);
    case 'shelf': return furniture.shelf(ctx, px, py, w);
    case 'cabinet': return furniture.cabinet(ctx, px, py);
    case 'safe': return furniture.safe(ctx, px, py);
    case 'plant': return decor.plant(ctx, px, py);
    case 'bigPlant': return decor.bigPlant(ctx, px, py);
    case 'tree': return decor.tree(ctx, px, py);
    case 'whiteboard': return decor.whiteboard(ctx, px, py, w);
    case 'board': return decor.board(ctx, px, py, w);
    case 'server': return decor.server(ctx, px, py);
    case 'easel': return decor.easel(ctx, px, py);
    case 'cooler': return decor.cooler(ctx, px, py);
    case 'boxes': return decor.boxes(ctx, px, py);
  }
}
