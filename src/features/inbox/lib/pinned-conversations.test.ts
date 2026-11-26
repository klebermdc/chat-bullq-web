import { describe, expect, it } from 'vitest';
import { PINNED_LIMIT, sanitizePinnedIds, togglePinned } from './pinned-conversations';

describe('sanitizePinnedIds', () => {
  it('ignora valor salvo inválido', () => {
    expect(sanitizePinnedIds(undefined)).toEqual([]);
    expect(sanitizePinnedIds('c1')).toEqual([]);
    expect(sanitizePinnedIds(['c1', 2, '', 'c1', 'c2'])).toEqual(['c1', 'c2']);
  });

  it('corta no teto', () => {
    expect(sanitizePinnedIds(['a', 'b', 'c', 'd', 'e', 'f', 'g'])).toHaveLength(PINNED_LIMIT);
  });
});

describe('togglePinned', () => {
  it('fixa na frente sem mexer na lista original', () => {
    const ids = ['a'];
    const result = togglePinned(ids, 'b');
    expect(result).toEqual({ ok: true, ids: ['b', 'a'], pinned: true });
    expect(ids).toEqual(['a']);
  });

  it('desafixa quem já estava', () => {
    expect(togglePinned(['a', 'b'], 'a')).toEqual({ ok: true, ids: ['b'], pinned: false });
  });

  it('recusa passar do teto', () => {
    expect(togglePinned(['a', 'b', 'c', 'd', 'e'], 'f')).toEqual({ ok: false, reason: 'limit' });
  });

  it('desafixar funciona mesmo no teto', () => {
    expect(togglePinned(['a', 'b', 'c', 'd', 'e'], 'e')).toMatchObject({ ok: true, pinned: false });
  });
});
