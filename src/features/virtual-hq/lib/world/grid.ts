import { T, type Prop, type Rect, type TileKind } from './types';

/** Grade em construção: só o montador do mapa mexe nela, antes de congelar o layout. */
export interface GridDraft {
  width: number;
  height: number;
  tiles: Uint8Array;
  solid: Uint8Array;
  roomAt: (string | null)[];
  props: Prop[];
}

export function createGrid(width: number, height: number): GridDraft {
  return {
    width,
    height,
    tiles: new Uint8Array(width * height).fill(T.GRASS),
    solid: new Uint8Array(width * height),
    roomAt: new Array<string | null>(width * height).fill(null),
    props: [],
  };
}

function eachCell(g: GridDraft, r: Rect, fn: (i: number) => void) {
  for (let y = r.y; y < r.y + r.h; y++) {
    for (let x = r.x; x < r.x + r.w; x++) {
      if (x >= 0 && y >= 0 && x < g.width && y < g.height) fn(y * g.width + x);
    }
  }
}

export function fillTiles(g: GridDraft, r: Rect, kind: TileKind) {
  eachCell(g, r, (i) => {
    g.tiles[i] = kind;
  });
}

export function setTile(g: GridDraft, x: number, y: number, kind: TileKind) {
  fillTiles(g, { x, y, w: 1, h: 1 }, kind);
}

export function markRoom(g: GridDraft, r: Rect, key: string) {
  eachCell(g, r, (i) => {
    g.roomAt[i] = key;
  });
}

export type PropSpec = Omit<Prop, 'w' | 'h' | 'layer' | 'solid'> & Partial<Pick<Prop, 'w' | 'h' | 'layer' | 'solid'>>;

const OVER_KINDS = new Set<Prop['kind']>(['desk', 'table', 'counter']);
const SOFT_KINDS = new Set<Prop['kind']>(['rug']);

export function addProp(g: GridDraft, spec: PropSpec) {
  const prop: Prop = {
    w: 1,
    h: 1,
    layer: OVER_KINDS.has(spec.kind) ? 'over' : 'under',
    solid: !SOFT_KINDS.has(spec.kind),
    ...spec,
  };
  g.props.push(prop);
  if (prop.solid) {
    eachCell(g, prop, (i) => {
      g.solid[i] = 1;
    });
  }
}

/** Marca um ladrilho como ocupado sem desenhar nada (robô, pessoa sentada). */
export function block(g: GridDraft, x: number, y: number) {
  eachCell(g, { x, y, w: 1, h: 1 }, (i) => {
    g.solid[i] = 1;
  });
}
