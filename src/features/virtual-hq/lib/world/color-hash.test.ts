import { describe, expect, it } from 'vitest';
import { hashString, lookFor, SHIRT_COLORS } from './color-hash';

describe('lookFor', () => {
  it('é determinístico para o mesmo id', () => {
    expect(lookFor('user-123')).toEqual(lookFor('user-123'));
    expect(hashString('abc')).toBe(hashString('abc'));
  });

  it('varia entre pessoas', () => {
    const shirts = new Set(Array.from({ length: 30 }, (_, i) => lookFor(`u${i}`).shirt));
    expect(shirts.size).toBeGreaterThan(4);
  });

  it('sempre devolve cores da paleta', () => {
    expect(SHIRT_COLORS).toContain(lookFor('').shirt);
  });
});
