import { describe, expect, it } from 'vitest';
import { sameKeyBytes, urlBase64ToUint8Array } from './push-keys';

describe('urlBase64ToUint8Array', () => {
  it('converte base64url sem padding', () => {
    // "hi?" em base64 é "aGk/"; em base64url, "aGk_".
    expect(Array.from(urlBase64ToUint8Array('aGk_'))).toEqual([104, 105, 63]);
  });

  it('completa o padding que falta', () => {
    expect(Array.from(urlBase64ToUint8Array('aGk'))).toEqual([104, 105]);
  });
});

describe('sameKeyBytes', () => {
  const key = new Uint8Array([1, 2, 3]);

  it('mesma chave (ArrayBuffer ou view) → true', () => {
    expect(sameKeyBytes(new Uint8Array([1, 2, 3]).buffer, key)).toBe(true);
    expect(sameKeyBytes(new Uint8Array([1, 2, 3]), key)).toBe(true);
  });

  it('chave diferente ou ausente → false', () => {
    expect(sameKeyBytes(new Uint8Array([1, 2, 4]), key)).toBe(false);
    expect(sameKeyBytes(new Uint8Array([1, 2]), key)).toBe(false);
    expect(sameKeyBytes(null, key)).toBe(false);
  });
});
