import { describe, expect, it } from 'vitest';
import type { Room, VirtualHqSnapshot } from '../../api';
import { buildWorld } from './layout';
import { buildScene, describeScene, shortName } from './scene';

const room = (over: Partial<Room>): Room => ({
  userId: 'u',
  name: 'Ana Souza',
  avatarUrl: null,
  role: 'AGENT',
  department: 'comercial',
  departmentSource: 'role',
  presence: 'online',
  alert: 'calm',
  stats: { openTotal: 0, awaitingReply: 0, closedToday: 0, assignedToday: 0, avgPickupMinutes: null },
  awaitingOldestSince: null,
  clients: [],
  guide: null,
  ...over,
});

const snap = (rooms: Room[], reception: VirtualHqSnapshot['reception'] = null): VirtualHqSnapshot => ({
  generatedAt: '', date: '2026-11-23', reception, rooms,
});

describe('buildScene', () => {
  it('mostra até 6 clientes e o resto vira +N', () => {
    const clients = Array.from({ length: 9 }, (_, i) => ({
      conversationId: `c${i}`, name: `C${i}`, phoneMasked: null, awaitingReply: i === 0, lastInboundAt: null,
    }));
    const s = snap([room({ userId: 'a', clients, alert: 'alert' })]);
    const scene = buildScene(buildWorld(s.rooms), s, null).find((r) => r.key === 'a')!;
    expect(scene.visitors).toHaveLength(6);
    expect(scene.overflow).toBe(3);
    expect(scene.visitors[0].waiting).toBe(true);
    expect(scene.alert).toBe('alert');
  });

  it('cliente leva a faixa da nota; API antiga ou valor estranho fica sem marca', () => {
    const card = (id: string, intent?: unknown) => ({
      conversationId: id, name: id, phoneMasked: null, awaitingReply: false, lastInboundAt: null,
      ...(intent ? { intent: intent as never } : {}),
    });
    const s = snap([
      room({
        userId: 'a',
        clients: [
          card('h', { score: 80, level: 'hot', reasons: [] }),
          card('x', { score: 0, level: 'fervendo', reasons: [] }),
          card('old'),
        ],
      }),
    ]);
    const scene = buildScene(buildWorld(s.rooms), s, null).find((r) => r.key === 'a')!;
    expect(scene.visitors.map((v) => v.heat)).toEqual(['hot', null, null]);
  });

  it('marca quem está jogando e cai em "fora" com presença estranha', () => {
    const s = snap([room({ userId: 'me', presence: 'zzz' as never })]);
    const scene = buildScene(buildWorld(s.rooms), s, 'me').find((r) => r.key === 'me')!;
    expect(scene.person).toMatchObject({ isPlayer: true, presence: 'offline', shortName: 'Ana' });
  });

  it('recepção com gente sem dono fica em atenção, robô no balcão', () => {
    const s = snap([], { unassigned: 2, oldestSince: null, enteredToday: 5 });
    const reception = buildScene(buildWorld([]), s, null).find((r) => r.key === 'reception')!;
    expect(reception).toMatchObject({ robot: true, alert: 'attention', overflow: 0 });
    expect(reception.visitors).toHaveLength(2);
  });

  it('resumo para leitor de tela', () => {
    const s = snap([room({ stats: { ...room({}).stats, awaitingReply: 3 }, alert: 'alert' })]);
    expect(describeScene(s)).toContain('3 clientes esperando');
    expect(describeScene(s)).toContain('1 em alerta');
    const withHot = snap([room({ intent: { hot: 2, warm: 1, cold: 0, hotWaiting: 1 } })]);
    expect(describeScene(withHot)).toContain('2 clientes quentes');
    expect(shortName('  ')).toBe('  ');
  });
});
