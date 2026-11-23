import { describe, expect, it } from 'vitest';
import { iso, layoutOffice, presenceLabel, waitedLabel } from './office-layout';
import type { Room } from '../api';

const room = (over: Partial<Room>): Room => ({
  userId: 'u',
  name: 'X',
  avatarUrl: null,
  role: 'AGENT',
  department: 'comercial',
  presence: 'online',
  alert: 'calm',
  stats: { openTotal: 0, awaitingReply: 0, closedToday: 0, assignedToday: 0, avgPickupMinutes: null },
  awaitingOldestSince: null,
  clients: [],
  guide: null,
  ...over,
});

describe('iso', () => {
  it('projeta a grade em losango (x-y, x+y)', () => {
    expect(iso(0, 0)).toEqual({ x: 0, y: 0 });
    expect(iso(1, 0)).toEqual({ x: 32, y: 16 });
    expect(iso(0, 1)).toEqual({ x: -32, y: 16 });
  });
});

describe('layoutOffice', () => {
  it('põe a recepção na frente e cada departamento numa fileira', () => {
    const slots = layoutOffice(
      [
        room({ userId: 'a', department: 'diretoria' }),
        room({ userId: 'b' }),
        room({ userId: 'c' }),
      ],
      true,
    );
    expect(slots.map((s) => s.key)).toEqual(['reception', 'a', 'b', 'c']);
    const [reception, a, b, c] = slots;
    expect(reception.row).toBe(0);
    expect(a.row).toBe(1);
    expect(b.row).toBe(2);
    expect(c).toMatchObject({ row: 2, col: b.col + 1 });
  });

  it('sem recepção (vendedor), a sala dele começa na primeira fileira', () => {
    const slots = layoutOffice([room({ userId: 'b' })], false);
    expect(slots).toEqual([expect.objectContaining({ key: 'b', row: 0, col: 0 })]);
  });

  it('quebra a fileira depois de 4 salas', () => {
    const rooms = Array.from({ length: 5 }, (_, i) => room({ userId: `r${i}` }));
    const slots = layoutOffice(rooms, false);
    expect(slots[4]).toMatchObject({ row: 1, col: 0 });
  });
});

describe('rótulos', () => {
  it('presença em português', () => {
    expect(presenceLabel('online')).toBe('Na mesa');
    expect(presenceLabel('away')).toBe('Ausente');
    expect(presenceLabel('offline')).toBe('Fora');
  });

  it('tempo de espera curto e legível', () => {
    const now = new Date('2026-11-22T15:00:00Z');
    expect(waitedLabel('2026-11-22T14:55:00Z', now)).toBe('5 min');
    expect(waitedLabel('2026-11-22T12:30:00Z', now)).toBe('2h30');
    expect(waitedLabel(null, now)).toBeNull();
  });
});
