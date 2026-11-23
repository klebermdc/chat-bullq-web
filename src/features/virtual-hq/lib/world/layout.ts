import { DEPARTMENTS, type Department } from '../../api';
import { DEPARTMENT_LABEL, resolveDepartment } from './departments';
import { furnishArea, furnishPersonRoom, furnishReception } from './furnish';
import { addProp, createGrid, fillTiles, markRoom, setTile, type GridDraft } from './grid';
import { AREA_IDS, T, type Sign, type TileKind, type WorldLayout, type WorldRoom } from './types';

/** Grama em volta do prédio. */
export const MARGIN = 3;
export const PERSON_W = 6;
export const PERSON_H = 5;
export const AREA_W = 7;
export const AREA_H = 5;
export const ROOMS_PER_ROW = 5;
const CORRIDOR_H = 2;
const SPINE_W = 2;
const RECEPTION_H = 6;
const RECEPTION_OPENING = 4;

const CARPET: Record<Department, TileKind> = {
  diretoria: T.CARPET_DIRETORIA,
  comercial: T.CARPET_COMERCIAL,
  guiamento: T.CARPET_GUIAMENTO,
  tecnologia: T.CARPET_TECNOLOGIA,
};

export interface PersonInput {
  userId: string;
  name: string;
  role: string;
  department?: unknown;
}

interface Band {
  department: Department;
  people: Array<PersonInput & { department: Department }>;
  first: boolean;
}

/** Agrupa por ala (na ordem fixa dos departamentos) e quebra em fileiras de até 5 salas. */
export function bandsFor(people: readonly PersonInput[]): Band[] {
  const resolved = people.map((p) => ({ ...p, department: resolveDepartment(p) }));
  return DEPARTMENTS.flatMap((department) => {
    const wing = resolved.filter((p) => p.department === department);
    const rows = Math.ceil(wing.length / ROOMS_PER_ROW);
    return Array.from({ length: rows }, (_, i) => ({
      department,
      people: wing.slice(i * ROOMS_PER_ROW, (i + 1) * ROOMS_PER_ROW),
      first: i === 0,
    }));
  });
}

const BAND_H = 1 + PERSON_H + 1 + CORRIDOR_H;

/**
 * Monta o mapa a partir dos dados: áreas fixas em cima, um corredor, as alas
 * (uma fileira de salas por vez, cada uma com o corredor embaixo) e a recepção
 * com a entrada no fim. Um corredor vertical à esquerda liga tudo.
 */
export function buildWorld(people: readonly PersonInput[]): WorldLayout {
  const bands = bandsFor(people);
  const x0 = MARGIN;
  const roomsX = x0 + 1 + SPINE_W;
  const areaEnd = x0 + AREA_IDS.length * (AREA_W + 1);
  const widestBand = Math.max(0, ...bands.map((b) => b.people.length));
  const xR = Math.max(areaEnd, roomsX + widestBand * (PERSON_W + 1));
  const yTop = MARGIN;
  const firstCorridor = yTop + AREA_H + 2;
  const receptionWall = firstCorridor + CORRIDOR_H + bands.length * BAND_H;
  const yBottom = receptionWall + RECEPTION_H + 1;
  const width = xR + 1 + MARGIN;
  const height = yBottom + 1 + MARGIN;

  const g = createGrid(width, height);
  fillTiles(g, { x: x0, y: yTop, w: xR - x0 + 1, h: yBottom - yTop + 1 }, T.WALL);

  const rooms: WorldRoom[] = [];
  const signs: Sign[] = [];

  // Áreas fixas, portas embaixo.
  AREA_IDS.forEach((areaId, i) => {
    const rect = { x: x0 + 1 + i * (AREA_W + 1), y: yTop + 1, w: AREA_W, h: AREA_H };
    carveRoom(g, rect, T.CHECKER, `area:${areaId}`);
    setTile(g, rect.x + Math.floor(AREA_W / 2), rect.y + AREA_H, T.DOOR);
    rooms.push(furnishArea(g, rect, areaId));
  });
  openLeftover(g, areaEnd + 1, xR - 1, yTop + 1, AREA_H + 1);

  fillTiles(g, { x: x0 + 1, y: firstCorridor, w: xR - x0 - 1, h: CORRIDOR_H }, T.WOOD);
  fillTiles(g, { x: x0 + 1, y: firstCorridor, w: SPINE_W, h: receptionWall - firstCorridor }, T.WOOD);

  bands.forEach((band, b) => {
    const top = firstCorridor + CORRIDOR_H + b * BAND_H;
    band.people.forEach((person, i) => {
      const rect = { x: roomsX + 1 + i * (PERSON_W + 1), y: top + 1, w: PERSON_W, h: PERSON_H };
      carveRoom(g, rect, CARPET[band.department], person.userId);
      setTile(g, rect.x + 1, top, T.DOOR);
      rooms.push(furnishPersonRoom(g, rect, person));
    });
    const bandEnd = roomsX + band.people.length * (PERSON_W + 1);
    openLeftover(g, bandEnd + 1, xR - 1, top, PERSON_H + 2);
    fillTiles(g, { x: x0 + 1, y: top + PERSON_H + 2, w: xR - x0 - 1, h: CORRIDOR_H }, T.WOOD);
    if (band.first) signs.push({ label: DEPARTMENT_LABEL[band.department], x: roomsX, y: top - CORRIDOR_H });
  });

  const receptionRect = { x: x0 + 1, y: receptionWall + 1, w: xR - x0 - 1, h: RECEPTION_H };
  carveRoom(g, receptionRect, T.CHECKER, 'reception');
  const entranceX = Math.floor((x0 + xR) / 2);
  fillTiles(g, { x: entranceX - RECEPTION_OPENING / 2, y: receptionWall, w: RECEPTION_OPENING, h: 1 }, T.WOOD);
  fillTiles(g, { x: entranceX - 1, y: yBottom, w: 2, h: 1 }, T.DOOR);
  fillTiles(g, { x: entranceX - 1, y: yBottom + 1, w: 2, h: MARGIN }, T.PATH);
  rooms.push(furnishReception(g, receptionRect, entranceX));
  plantTrees(g, x0, xR, yTop, yBottom, entranceX);

  return {
    width,
    height,
    tiles: g.tiles,
    solid: g.solid,
    roomAt: g.roomAt,
    rooms,
    props: g.props,
    signs,
    spawn: { x: entranceX - 1, y: yBottom - 1 },
  };
}

function carveRoom(g: GridDraft, rect: { x: number; y: number; w: number; h: number }, floor: TileKind, key: string) {
  fillTiles(g, rect, floor);
  markRoom(g, rect, key);
}

/** Sobra de largura numa fileira vira um saguão aberto com plantas. */
function openLeftover(g: GridDraft, fromX: number, toX: number, y: number, h: number) {
  if (toX < fromX) return;
  fillTiles(g, { x: fromX, y, w: toX - fromX + 1, h }, T.WOOD);
  addProp(g, { kind: 'bigPlant', x: toX, y });
  if (toX - fromX + 1 < LOUNGE_MIN_W || h < 5) return;
  // Copa: sofá, mesinha e bebedouro, deixando passagem livre em volta.
  addProp(g, { kind: 'rug', x: fromX + 2, y: y + 2, w: 4, h: 2 });
  addProp(g, { kind: 'sofa', x: fromX + 2, y: y + 1, w: 3 });
  addProp(g, { kind: 'plant', x: fromX + 5, y: y + 1 });
  addProp(g, { kind: 'table', x: fromX + 3, y: y + 3, w: 2, h: 1 });
  addProp(g, { kind: 'cooler', x: toX - 1, y });
}

/** Largura mínima de sobra para virar copa (sofá + passagem dos dois lados). */
const LOUNGE_MIN_W = 8;

/** Árvores na grama, sempre nos mesmos lugares. */
function plantTrees(g: GridDraft, x0: number, xR: number, yTop: number, yBottom: number, entranceX: number) {
  const STEP = 4;
  for (let y = yTop + 1; y < yBottom; y += STEP) {
    addProp(g, { kind: 'tree', x: x0 - 2, y, solid: false });
    addProp(g, { kind: 'tree', x: xR + 2, y: y + 2, solid: false });
  }
  for (let x = x0 + 2; x < xR; x += STEP + 1) {
    if (Math.abs(x - entranceX) > 3) addProp(g, { kind: 'tree', x, y: yBottom + 2, solid: false });
  }
}
