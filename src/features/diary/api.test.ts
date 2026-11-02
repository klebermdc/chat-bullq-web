import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/lib/api';
import { fetchDiaryParticipants, fetchMyDiary } from './api';

vi.mock('@/lib/api', () => ({ api: { get: vi.fn(), post: vi.fn() } }));

const respondWith = (data: unknown) =>
  vi.mocked(api.get).mockResolvedValue({
    data: { data, meta: { timestamp: '2026-11-02T00:00:00.000Z' } },
  });

describe('fetchMyDiary', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns null when the API has no diary for the user', async () => {
    respondWith(null);

    await expect(fetchMyDiary()).resolves.toBeNull();
  });

  it('returns the diary without the response envelope', async () => {
    respondWith({ id: 'diary-1', day: '2026-10-31' });

    await expect(fetchMyDiary()).resolves.toEqual({ id: 'diary-1', day: '2026-10-31' });
  });
});

describe('fetchDiaryParticipants', () => {
  it('returns the list without the response envelope', async () => {
    respondWith([{ userId: 'user-1', name: 'Pedro' }]);

    await expect(fetchDiaryParticipants()).resolves.toEqual([{ userId: 'user-1', name: 'Pedro' }]);
  });
});
