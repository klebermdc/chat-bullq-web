import { describe, expect, it, vi } from 'vitest';

vi.mock('@/stores/auth-store', () => ({ useAuthStore: vi.fn() }));

import { isManagerRole } from './permissions';

describe('isManagerRole', () => {
  it('accepts only owner and admin', () => {
    expect(isManagerRole('OWNER')).toBe(true);
    expect(isManagerRole('ADMIN')).toBe(true);
    expect(isManagerRole('AGENT')).toBe(false);
    expect(isManagerRole(null)).toBe(false);
    expect(isManagerRole(undefined)).toBe(false);
  });
});
