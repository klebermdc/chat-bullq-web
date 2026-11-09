import { describe, expect, it } from 'vitest';
import { canChangeReply } from './quick-reply-permissions';

describe('canChangeReply', () => {
  const own = { ownerUserId: 'u3' };
  const team = { ownerUserId: null };
  const other = { ownerUserId: 'u9' };

  it('atendente muda só a própria', () => {
    const agent = { userId: 'u3', isManager: false };
    expect(canChangeReply(own, agent)).toBe(true);
    expect(canChangeReply(team, agent)).toBe(false);
    expect(canChangeReply(other, agent)).toBe(false);
  });

  it('dono/admin mudam qualquer uma', () => {
    const admin = { userId: 'adm', isManager: true };
    expect([own, team, other].every((r) => canChangeReply(r, admin))).toBe(true);
  });

  it('sem usuário carregado não muda nada', () => {
    expect(canChangeReply(own, { userId: null, isManager: false })).toBe(false);
  });
});
