import { describe, expect, it } from 'vitest';
import {
  INBOX_CHANNEL_TYPES,
  INSTAGRAM_CHANNEL_TYPES,
  WHATSAPP_CHANNEL_TYPES,
} from './channel-types';

describe('INBOX_CHANNEL_TYPES', () => {
  it('junta os três sabores de WhatsApp e o Instagram numa lista só', () => {
    const types = INBOX_CHANNEL_TYPES.split(',');

    expect(types).toEqual([
      ...WHATSAPP_CHANNEL_TYPES.split(','),
      INSTAGRAM_CHANNEL_TYPES,
    ]);
    expect(new Set(types).size).toBe(types.length);
  });
});
