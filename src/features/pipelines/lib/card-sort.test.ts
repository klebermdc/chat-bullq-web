import { describe, expect, it } from 'vitest';
import { nextCardSort, sortCards } from './card-sort';

const CARDS = [
  { id: 'b', createdAt: '2026-11-25T12:00:00Z' },
  { id: 'a', createdAt: '2026-11-24T08:00:00Z' },
  { id: 'c', createdAt: '2026-11-26T20:00:00Z' },
];

describe('sortCards', () => {
  it('mais novo primeiro', () => {
    expect(sortCards(CARDS, 'newest').map((c) => c.id)).toEqual(['c', 'b', 'a']);
  });

  it('mais antigo primeiro', () => {
    expect(sortCards(CARDS, 'oldest').map((c) => c.id)).toEqual(['a', 'b', 'c']);
  });

  it('ordem do quadro mantém a ordem recebida', () => {
    expect(sortCards(CARDS, 'manual').map((c) => c.id)).toEqual(['b', 'a', 'c']);
  });

  it('não altera o array original', () => {
    const before = CARDS.map((c) => c.id);
    sortCards(CARDS, 'newest');
    expect(CARDS.map((c) => c.id)).toEqual(before);
  });

  it('data inválida vai para o lado mais antigo sem quebrar', () => {
    const cards = [...CARDS, { id: 'x', createdAt: 'lixo' }];
    expect(sortCards(cards, 'oldest')[0].id).toBe('x');
  });
});

describe('nextCardSort', () => {
  it('do padrão vai para mais novo e depois alterna', () => {
    expect(nextCardSort('manual')).toBe('newest');
    expect(nextCardSort('newest')).toBe('oldest');
    expect(nextCardSort('oldest')).toBe('newest');
  });
});
