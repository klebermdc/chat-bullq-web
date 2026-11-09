import { describe, expect, it } from 'vitest';
import type { Member } from '@/features/settings/services/members.service';
import { canRemoveParticipant, participantCandidates } from './participants';

const member = (id: string, name: string, isActive = true) =>
  ({
    role: 'AGENT',
    user: { id, name, email: `${id}@ofp.com`, isActive, avatarUrl: null },
  }) as unknown as Member;

const team = [
  member('renata', 'Renata'),
  member('kleber', 'Kleber'),
  member('pedro', 'Pedro'),
  member('ex', 'Ex-vendedor', false),
];

describe('participantCandidates', () => {
  it('tira o dono, quem já está e quem está inativo', () => {
    const out = participantCandidates(team, ['pedro'], 'renata', '');
    expect(out.map((m) => m.user.id)).toEqual(['kleber']);
  });

  it('busca por nome sem diferenciar maiúsculas', () => {
    const out = participantCandidates(team, [], 'renata', 'KLE');
    expect(out.map((m) => m.user.id)).toEqual(['kleber']);
  });

  it('busca por e-mail', () => {
    const out = participantCandidates(team, [], null, 'pedro@');
    expect(out.map((m) => m.user.id)).toEqual(['pedro']);
  });
});

describe('canRemoveParticipant', () => {
  const base = { targetId: 'kleber', ownerId: 'renata', isManager: false };

  it('o incluído pode sair', () => {
    expect(canRemoveParticipant({ ...base, currentUserId: 'kleber' })).toBe(true);
  });
  it('o dono pode tirar', () => {
    expect(canRemoveParticipant({ ...base, currentUserId: 'renata' })).toBe(true);
  });
  it('outro incluído não pode tirar', () => {
    expect(canRemoveParticipant({ ...base, currentUserId: 'pedro' })).toBe(false);
  });
  it('gestão pode tirar', () => {
    expect(
      canRemoveParticipant({ ...base, currentUserId: 'adm', isManager: true }),
    ).toBe(true);
  });
});
