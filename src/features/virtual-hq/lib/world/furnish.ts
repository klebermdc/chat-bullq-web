import type { Department } from '../../api';
import { addProp, block, type GridDraft } from './grid';
import type { AreaId, Point, Rect, WorldRoom } from './types';

const at = (r: Rect, dx: number, dy: number): Point => ({ x: r.x + dx, y: r.y + dy });

/** Sala de uma pessoa (piso 6x5): estante, mesa com computador, tapete para os clientes. */
export function furnishPersonRoom(
  g: GridDraft,
  rect: Rect,
  person: { userId: string; name: string; department: Department },
): WorldRoom {
  const p = (dx: number, dy: number) => at(rect, dx, dy);
  addProp(g, { kind: 'cabinet', ...p(0, 0) });
  addProp(g, { kind: 'shelf', ...p(3, 0), w: 2 });
  addProp(g, { kind: 'plant', ...p(5, 0) });
  addProp(g, { kind: 'chair', ...p(3, 1) });
  addProp(g, { kind: 'desk', ...p(2, 2), w: 3 });
  addProp(g, { kind: 'rug', ...p(1, 3), w: 4, h: 2 });
  return {
    key: person.userId,
    kind: 'person',
    title: `Sala de ${person.name}`,
    userId: person.userId,
    department: person.department,
    rect,
    seat: p(3, 1),
    visitorSlots: [p(3, 3), p(2, 3), p(4, 3), p(2, 4), p(3, 4), p(4, 4)],
    overflowAt: p(5, 4),
  };
}

export const AREA_TITLE: Record<AreaId, string> = {
  reuniao: 'Sala de Reuniões',
  posVenda: 'Pós-venda',
  marketing: 'Marketing',
  financeiro: 'Financeiro',
  iaCentral: 'Central de IA',
};

type Furnisher = (g: GridDraft, p: (dx: number, dy: number) => Point) => Point | null;

/** Cada área tem a sua mobília; devolve o assento de quem "trabalha" ali (só o robô da IA). */
const AREA_FURNITURE: Record<AreaId, Furnisher> = {
  reuniao: (g, p) => {
    addProp(g, { kind: 'whiteboard', ...p(2, 0), w: 3 });
    addProp(g, { kind: 'table', ...p(2, 1), w: 3, h: 2 });
    for (const [dx, dy] of [[1, 1], [1, 2], [5, 1], [5, 2]] as const) addProp(g, { kind: 'stool', ...p(dx, dy) });
    return null;
  },
  posVenda: (g, p) => {
    addProp(g, { kind: 'cabinet', ...p(1, 0) });
    addProp(g, { kind: 'cabinet', ...p(2, 0) });
    addProp(g, { kind: 'board', ...p(4, 0), w: 2 });
    addProp(g, { kind: 'chair', ...p(3, 1) });
    addProp(g, { kind: 'desk', ...p(2, 2), w: 3 });
    addProp(g, { kind: 'boxes', ...p(5, 3) });
    return null;
  },
  marketing: (g, p) => {
    addProp(g, { kind: 'shelf', ...p(1, 0), w: 2 });
    addProp(g, { kind: 'easel', ...p(5, 1) });
    addProp(g, { kind: 'chair', ...p(2, 1) });
    addProp(g, { kind: 'desk', ...p(1, 2), w: 3 });
    return null;
  },
  financeiro: (g, p) => {
    addProp(g, { kind: 'cabinet', ...p(4, 0) });
    addProp(g, { kind: 'safe', ...p(5, 0) });
    addProp(g, { kind: 'chair', ...p(2, 1) });
    addProp(g, { kind: 'desk', ...p(1, 2), w: 3 });
    return null;
  },
  iaCentral: (g, p) => {
    for (const dx of [1, 2, 4, 5]) addProp(g, { kind: 'server', ...p(dx, 0) });
    addProp(g, { kind: 'desk', ...p(2, 2), w: 3 });
    const seat = p(3, 1);
    block(g, seat.x, seat.y);
    return seat;
  },
};

/** Área fixa (piso 7x5), porta embaixo no meio. */
export function furnishArea(g: GridDraft, rect: Rect, areaId: AreaId): WorldRoom {
  const p = (dx: number, dy: number) => at(rect, dx, dy);
  addProp(g, { kind: 'plant', ...p(0, 0) });
  addProp(g, { kind: 'plant', ...p(rect.w - 1, 0) });
  const seat = AREA_FURNITURE[areaId](g, p);
  return {
    key: `area:${areaId}`,
    kind: 'area',
    title: AREA_TITLE[areaId],
    areaId,
    rect,
    seat,
    visitorSlots: [],
    overflowAt: p(rect.w - 1, rect.h - 1),
  };
}

/** Recepção: balcão no meio com a atendente-robô, sofás nas laterais, entrada embaixo. */
export function furnishReception(g: GridDraft, rect: Rect, entranceX: number): WorldRoom {
  const cx = entranceX;
  const y0 = rect.y;
  const right = rect.x + rect.w - 1;
  addProp(g, { kind: 'plant', x: rect.x, y: y0 });
  addProp(g, { kind: 'plant', x: right, y: y0 });
  addProp(g, { kind: 'cooler', x: right - 1, y: y0 });
  addProp(g, { kind: 'sofa', x: rect.x + 1, y: y0 + 1, w: 3 });
  addProp(g, { kind: 'sofa', x: rect.x + 1, y: y0 + 4, w: 3 });
  addProp(g, { kind: 'sofa', x: right - 3, y: y0 + 1, w: 3 });
  addProp(g, { kind: 'bigPlant', x: cx - 3, y: y0 + rect.h - 1 });
  addProp(g, { kind: 'bigPlant', x: cx + 2, y: y0 + rect.h - 1 });
  addProp(g, { kind: 'rug', x: cx - 3, y: y0 + 3, w: 6, h: 2 });
  addProp(g, { kind: 'counter', x: cx - 3, y: y0 + 2, w: 6 });
  const seat = { x: cx - 1, y: y0 + 1 };
  block(g, seat.x, seat.y);
  return {
    key: 'reception',
    kind: 'reception',
    title: 'Recepção',
    rect,
    seat,
    visitorSlots: [-1, -2, 0, -3, 1, 2].map((dx) => ({ x: cx + dx, y: y0 + 3 })),
    overflowAt: { x: cx + 3, y: y0 + 3 },
  };
}
