import { describe, expect, it } from 'vitest';
import { createActivityThrottle } from './presence-activity';

function clock(start = 0) {
  let t = start;
  return { now: () => t, advance: (ms: number) => { t += ms; } };
}

describe('createActivityThrottle', () => {
  it('emite na primeira interação e segura as seguintes por 60s', () => {
    const c = clock();
    const throttle = createActivityThrottle(60_000, c.now);
    let emits = 0;
    const emit = () => { emits += 1; return true; };

    expect(throttle.tryEmit(emit)).toBe(true);
    c.advance(30_000);
    expect(throttle.tryEmit(emit)).toBe(false);
    c.advance(29_999);
    expect(throttle.tryEmit(emit)).toBe(false);
    c.advance(1);
    expect(throttle.tryEmit(emit)).toBe(true);
    expect(emits).toBe(2);
  });

  it('não consome a janela quando o socket está desconectado', () => {
    const c = clock();
    const throttle = createActivityThrottle(60_000, c.now);

    expect(throttle.tryEmit(() => false)).toBe(false);
    c.advance(1_000);
    expect(throttle.tryEmit(() => true)).toBe(true);
  });

  it('reset reabre a janela (reconexão)', () => {
    const c = clock();
    const throttle = createActivityThrottle(60_000, c.now);

    throttle.tryEmit(() => true);
    c.advance(5_000);
    throttle.reset();
    expect(throttle.tryEmit(() => true)).toBe(true);
  });
});
