import { describe, expect, it } from 'vitest';
import { bandsFor, buildWorld, ROOMS_PER_ROW, type PersonInput } from './layout';
import { findPath } from './pathfinding';
import { isWalkable, roomKeyAt, type WorldLayout } from './types';

const person = (userId: string, over: Partial<PersonInput> = {}): PersonInput => ({
  userId,
  name: `Pessoa ${userId}`,
  role: 'AGENT',
  ...over,
});

const walk = (l: WorldLayout) => (x: number, y: number) => isWalkable(l, x, y);

/** Toda sala precisa ser alcançável a pé a partir da entrada. */
function expectAllRoomsReachable(l: WorldLayout) {
  for (const room of l.rooms) {
    const target = { x: room.rect.x + Math.floor(room.rect.w / 2), y: room.rect.y + room.rect.h - 1 };
    const path = findPath(l.spawn, target, walk(l));
    expect(path, `sala ${room.key}`).not.toBeNull();
  }
}

describe('buildWorld', () => {
  it('sem ninguém, ainda tem as áreas fixas e a recepção', () => {
    const l = buildWorld([]);
    expect(l.rooms.map((r) => r.key)).toEqual([
      'area:reuniao', 'area:posVenda', 'area:marketing', 'area:financeiro', 'area:iaCentral', 'reception',
    ]);
    expect(l.signs).toEqual([]);
    expect(isWalkable(l, l.spawn.x, l.spawn.y)).toBe(true);
    expect(roomKeyAt(l, l.spawn.x, l.spawn.y)).toBe('reception');
    expectAllRoomsReachable(l);
  });

  it('uma pessoa ganha sala, mesa, cadeira e placa da ala', () => {
    const l = buildWorld([person('a', { name: 'Ana Souza' })]);
    const room = l.rooms.find((r) => r.key === 'a');
    expect(room).toMatchObject({ kind: 'person', department: 'comercial', title: 'Sala de Ana Souza' });
    expect(room!.seat).not.toBeNull();
    expect(roomKeyAt(l, room!.rect.x, room!.rect.y)).toBe('a');
    expect(l.props.some((p) => p.kind === 'desk' && p.y === room!.seat!.y + 1)).toBe(true);
    expect(l.signs.map((s) => s.label)).toEqual(['Comercial']);
    expectAllRoomsReachable(l);
  });

  it('muita gente: alas na ordem fixa e fileiras de no máximo 5', () => {
    const people = [
      ...Array.from({ length: 7 }, (_, i) => person(`c${i}`)),
      person('t1', { department: 'tecnologia' }),
      person('d1', { role: 'OWNER' }),
      person('g1', { department: 'guiamento' }),
    ];
    const l = buildWorld(people);
    expect(l.signs.map((s) => s.label)).toEqual(['Diretoria', 'Comercial', 'Guiamento', 'Tecnologia']);
    const ys = new Set(l.rooms.filter((r) => r.key.startsWith('c')).map((r) => r.rect.y));
    expect(ys.size).toBe(2);
    expect(l.rooms.filter((r) => r.kind === 'person')).toHaveLength(10);
    expectAllRoomsReachable(l);
  });

  it('departamento desconhecido ou ausente cai no padrão pelo papel', () => {
    const bands = bandsFor([
      person('x', { department: 'astronautas' }),
      person('y', { role: 'ADMIN', department: undefined }),
    ]);
    expect(bands.map((b) => [b.department, b.people.map((p) => p.userId)])).toEqual([
      ['diretoria', ['y']],
      ['comercial', ['x']],
    ]);
  });

  it('quebra a ala em fileiras de 5', () => {
    const bands = bandsFor(Array.from({ length: ROOMS_PER_ROW + 1 }, (_, i) => person(`p${i}`)));
    expect(bands.map((b) => [b.people.length, b.first])).toEqual([[5, true], [1, false]]);
  });

  it('é determinístico', () => {
    const people = [person('a'), person('b', { department: 'guiamento' })];
    const a = buildWorld(people);
    const b = buildWorld(people);
    expect(Array.from(a.tiles)).toEqual(Array.from(b.tiles));
    expect(a.rooms).toEqual(b.rooms);
  });
});
