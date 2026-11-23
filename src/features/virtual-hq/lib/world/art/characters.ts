import type { AvatarLook, HairStyle } from '../color-hash';
import { lookKey } from '../color-hash';
import type { Direction } from '../player';
import {
  BUBBLE_ALERT_ROWS, BUBBLE_SLEEP_ROWS, CHAR_H, CHAR_W, characterRows, ROBOT_ROWS, SUITCASE_ROWS,
  VISITOR_ROWS, type View,
} from './character-templates';
import { P } from './palette';
import { darken, makeSprite, paintRows, setPixel, type Palette } from './pixels';

type Edit = readonly [x: number, y: number, ch: string];

function hairEdits(view: View, style: HairStyle): Edit[] {
  const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i);
  if (style === 'long') {
    const cols = view === 'side' ? [4, 5] : [4, 11];
    return range(4, 7).flatMap((y) => cols.map((x): Edit => [x, y, 'H']));
  }
  if (style === 'bun') return range(6, 9).map((x): Edit => [x, 0, 'H']);
  if (style === 'cap') {
    const crown = range(1, 2).flatMap((y) => range(4, 11).map((x): Edit => [x, y, 'C']));
    const brim = view === 'side' ? range(8, 13) : view === 'front' ? range(3, 12) : [];
    return [...crown, ...brim.map((x): Edit => [x, 3, 'C'])];
  }
  return [];
}

function characterPalette(look: AvatarLook): Palette {
  return {
    O: P.outline,
    H: look.hair,
    C: darken(look.shirt, 0.35),
    S: look.skin,
    K: look.skin,
    M: darken(look.skin, 0.3),
    E: '#1d1a26',
    T: look.shirt,
    t: darken(look.shirt, 0.2),
    A: darken(look.shirt, 0.08),
    P: look.pants,
    B: '#3a2f45',
  };
}

const VIEW_OF: Record<Direction, View> = { down: 'front', up: 'back', left: 'side', right: 'side' };

const cache = new Map<string, HTMLCanvasElement>();

function cached(key: string, make: () => HTMLCanvasElement): HTMLCanvasElement {
  const hit = cache.get(key);
  if (hit) return hit;
  const sprite = make();
  cache.set(key, sprite);
  return sprite;
}

/** Boneco pronto para copiar na tela (16x19), olhando para `facing`. */
export function characterSprite(look: AvatarLook, facing: Direction, frame: 0 | 1 | 2): HTMLCanvasElement {
  const view = VIEW_OF[facing];
  const sideFrame = view === 'side' ? (frame === 0 ? 0 : frame === 1 ? 1 : 0) : frame;
  return cached(`c|${lookKey(look)}|${facing}|${sideFrame}`, () =>
    makeSprite(CHAR_W, CHAR_H, (ctx) => {
      const rows = hairEdits(view, look.hairStyle).reduce(
        (acc, [x, y, ch]) => setPixel(acc, x, y, ch),
        characterRows(view, sideFrame as 0 | 1 | 2),
      );
      if (facing === 'left') {
        ctx.translate(CHAR_W, 0);
        ctx.scale(-1, 1);
      }
      paintRows(ctx, rows, characterPalette(look), 0, 0);
    }),
  );
}

export function visitorSprite(look: AvatarLook): HTMLCanvasElement {
  return cached(`v|${lookKey(look)}`, () =>
    makeSprite(VISITOR_ROWS[0].length, VISITOR_ROWS.length, (ctx) =>
      paintRows(ctx, VISITOR_ROWS, { ...characterPalette(look), W: look.hair, w: darken(look.hair, 0.3) }, 0, 0),
    ),
  );
}

export function suitcaseSprite(color: string): HTMLCanvasElement {
  return cached(`s|${color}`, () =>
    makeSprite(SUITCASE_ROWS[0].length, SUITCASE_ROWS.length, (ctx) =>
      paintRows(ctx, SUITCASE_ROWS, { O: P.outline, G: color, Y: P.yellow }, 0, 0),
    ),
  );
}

export function robotSprite(lightOn: boolean): HTMLCanvasElement {
  return cached(`r|${lightOn}`, () =>
    makeSprite(ROBOT_ROWS[0].length, ROBOT_ROWS.length, (ctx) =>
      paintRows(
        ctx,
        ROBOT_ROWS,
        { O: P.outline, G: '#d8dde6', g: '#a9b1bf', D: P.screen, C: P.screenGlow, L: lightOn ? '#ff6b6b' : '#7a3b3b' },
        0,
        0,
      ),
    ),
  );
}

export function alertBubbleSprite(): HTMLCanvasElement {
  return cached('b|alert', () =>
    makeSprite(BUBBLE_ALERT_ROWS[0].length, BUBBLE_ALERT_ROWS.length, (ctx) =>
      paintRows(ctx, BUBBLE_ALERT_ROWS, { O: P.outline, Y: P.yellow, K: P.outline }, 0, 0),
    ),
  );
}

export function sleepBubbleSprite(): HTMLCanvasElement {
  return cached('b|sleep', () =>
    makeSprite(BUBBLE_SLEEP_ROWS[0].length, BUBBLE_SLEEP_ROWS.length, (ctx) =>
      paintRows(ctx, BUBBLE_SLEEP_ROWS, { O: P.outline, W: P.white, K: '#5b5f86' }, 0, 0),
    ),
  );
}
