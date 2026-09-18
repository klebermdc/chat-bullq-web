import { describe, expect, it } from 'vitest';
import { computeWindowState } from './window-state';

const H = 60 * 60 * 1000;
const now = Date.parse('2026-09-18T17:30:00.000Z');
const iso = (ms: number) => new Date(ms).toISOString();

describe('computeWindowState — duas contagens', () => {
  // Caso real 2026-09-18 (lead Leidiany): texto livre 29h após o último
  // inbound, dentro das 72h do anúncio → Meta recusou com 131047. A contagem
  // de texto livre precisa estar FECHADA; a de template grátis, aberta.
  it('CSW fechada + free entry aberto → texto livre fechado, template grátis contando', () => {
    const w = computeWindowState({
      channelType: 'WHATSAPP_OFFICIAL',
      windowExpiresAt: iso(now - 5 * H),
      freeEntryExpiresAt: iso(now + 43 * H),
      now,
    });
    expect(w.closed).toBe(true);
    expect(w.freeEntryOpen).toBe(true);
    expect(w.freeEntryMsLeft).toBe(43 * H);
  });

  it('CSW aberta → texto livre contando', () => {
    const w = computeWindowState({
      channelType: 'WHATSAPP_OFFICIAL',
      windowExpiresAt: iso(now + 3 * H),
      freeEntryExpiresAt: null,
      now,
    });
    expect(w.open).toBe(true);
    expect(w.msLeft).toBe(3 * H);
    expect(w.freeEntryOpen).toBe(false);
    expect(w.freeEntryMsLeft).toBe(0);
  });

  it('free entry vencido → contagem de template some', () => {
    const w = computeWindowState({
      channelType: 'WHATSAPP_OFFICIAL',
      windowExpiresAt: iso(now - 50 * H),
      freeEntryExpiresAt: iso(now - 1 * H),
      now,
    });
    expect(w.freeEntryOpen).toBe(false);
    expect(w.freeEntryMsLeft).toBe(0);
  });

  it('fallback sem servidor: último inbound + 24h', () => {
    const w = computeWindowState({
      channelType: 'WHATSAPP_OFFICIAL',
      lastInboundAt: iso(now - 25 * H),
      now,
    });
    expect(w.closed).toBe(true);
    expect(w.expiresAt).toBe(now - 1 * H);
  });

  it('canal não-oficial → nada aplicável', () => {
    const w = computeWindowState({
      channelType: 'WHATSAPP_ZAPPFY',
      windowExpiresAt: iso(now + 3 * H),
      freeEntryExpiresAt: iso(now + 40 * H),
      now,
    });
    expect(w.applicable).toBe(false);
    expect(w.freeEntryOpen).toBe(false);
  });
});
