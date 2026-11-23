import { drawProp } from '../art/props';
import { makeSprite } from '../art/pixels';
import { drawTile } from '../art/tiles';
import { TILE, type Prop, type WorldLayout } from '../types';

export interface StaticLayers {
  /** Chão, paredes e móveis baixos. */
  under: HTMLCanvasElement;
  /** Mesas e balcões: vão por cima de quem está sentado atrás. */
  over: HTMLCanvasElement;
}

/** Tapetes primeiro; o resto de cima para baixo, para o de baixo cobrir o de cima. */
const byDepth = (a: Prop, b: Prop) => Number(b.kind === 'rug') - Number(a.kind === 'rug') || a.y + a.h - (b.y + b.h);

/** Desenha uma vez tudo o que não se mexe; a cada quadro só copiamos estas imagens. */
export function renderStaticLayers(layout: WorldLayout): StaticLayers {
  const w = layout.width * TILE;
  const h = layout.height * TILE;
  const props = [...layout.props].sort(byDepth);
  const under = makeSprite(w, h, (ctx) => {
    for (let y = 0; y < layout.height; y++) {
      for (let x = 0; x < layout.width; x++) drawTile(ctx, layout, x, y);
    }
    props.filter((p) => p.layer === 'under').forEach((p) => drawProp(ctx, p));
  });
  const over = makeSprite(w, h, (ctx) => {
    props.filter((p) => p.layer === 'over').forEach((p) => drawProp(ctx, p));
  });
  return { under, over };
}
