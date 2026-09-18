import { describe, it, expect } from 'vitest';
import { prefFor, isAllSoundMuted, withSoundForAll } from './notification-store';
import type { NotificationPreference } from '@/features/settings/services/notifications.service';

const row = (type: string, sound: boolean): NotificationPreference => ({
  type, inApp: true, browserPush: true, sound, dndStart: null, dndEnd: null,
});

describe('prefFor', () => {
  it('returns the saved row when the type exists', () => {
    const prefs = [row('NEW_MESSAGE', false), row('SYSTEM', true)];
    expect(prefFor(prefs, 'NEW_MESSAGE').sound).toBe(false);
    expect(prefFor(prefs, 'SYSTEM').sound).toBe(true);
  });

  it('defaults to sound on when nothing was ever saved', () => {
    expect(prefFor([], 'NEW_MESSAGE').sound).toBe(true);
  });

  it('keeps an unsaved type silent when the user muted every saved type', () => {
    const prefs = [row('NEW_MESSAGE', false), row('SLA_WARNING', false)];
    expect(prefFor(prefs, 'AI_TOOL_FAILURE').sound).toBe(false);
  });

  it('defaults an unsaved type to sound on when some saved type still rings', () => {
    const prefs = [row('NEW_MESSAGE', false), row('SYSTEM', true)];
    expect(prefFor(prefs, 'AI_TOOL_FAILURE').sound).toBe(true);
  });
});

describe('isAllSoundMuted', () => {
  it('is false when nothing was saved', () => {
    expect(isAllSoundMuted([])).toBe(false);
  });

  it('is true only when every saved type is silent', () => {
    expect(isAllSoundMuted([row('A', false), row('B', false)])).toBe(true);
    expect(isAllSoundMuted([row('A', false), row('B', true)])).toBe(false);
  });
});

describe('withSoundForAll', () => {
  it('sets sound on every listed type without touching the other fields', () => {
    const current = [{ ...row('NEW_MESSAGE', true), inApp: false }];
    const next = withSoundForAll(current, ['NEW_MESSAGE', 'SYSTEM'], false);
    expect(next).toHaveLength(2);
    expect(next.every((p) => p.sound === false)).toBe(true);
    expect(next.find((p) => p.type === 'NEW_MESSAGE')?.inApp).toBe(false);
    expect(current[0].sound).toBe(true);
  });
});
