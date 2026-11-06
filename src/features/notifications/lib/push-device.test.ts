import { describe, expect, it } from 'vitest';
import { pushDeviceState, PushDeviceEnv } from './push-device';

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 Version/17.4 Mobile/15E148 Safari/604.1';
const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/126.0 Mobile Safari/537.36';
const MAC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 Version/17.5 Safari/605.1.15';

const env = (over: Partial<PushDeviceEnv> = {}): PushDeviceEnv => ({
  secure: true, standalone: false, userAgent: ANDROID, platform: 'Linux armv8l', maxTouchPoints: 5,
  hasNotification: true, hasServiceWorker: true, hasPushManager: true, ...over,
});

describe('pushDeviceState', () => {
  it('Android/Chrome com suporte → ready', () => {
    expect(pushDeviceState(env())).toBe('ready');
  });

  it('iPhone no Safari, fora do app instalado → precisa instalar', () => {
    expect(pushDeviceState(env({ userAgent: IPHONE, platform: 'iPhone', hasPushManager: false }))).toBe('ios-needs-install');
  });

  it('iPhone com o app instalado → ready', () => {
    expect(pushDeviceState(env({ userAgent: IPHONE, platform: 'iPhone', standalone: true }))).toBe('ready');
  });

  it('iPad que se apresenta como Mac → trata como iPhone', () => {
    expect(pushDeviceState(env({ userAgent: MAC, platform: 'MacIntel', maxTouchPoints: 5 }))).toBe('ios-needs-install');
  });

  it('Mac de verdade (sem toque) → ready', () => {
    expect(pushDeviceState(env({ userAgent: MAC, platform: 'MacIntel', maxTouchPoints: 0 }))).toBe('ready');
  });

  it('sem https → insecure', () => {
    expect(pushDeviceState(env({ secure: false }))).toBe('insecure');
  });

  it('navegador do Instagram → unsupported', () => {
    expect(pushDeviceState(env({ userAgent: `${ANDROID} Instagram 300.0` }))).toBe('unsupported');
  });

  it('sem PushManager → unsupported', () => {
    expect(pushDeviceState(env({ hasPushManager: false }))).toBe('unsupported');
  });
});
