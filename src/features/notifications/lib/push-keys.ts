/*
 * Adaptado de DeskcommCRM (https://github.com/melgarafael/DeskcommCRM), MIT License, Copyright (c) 2026 Rafael Melgaço.
 * Origem: lib/notifications/push_client.ts
 */

/** Chave VAPID pública (base64url) → bytes, no formato que o `pushManager.subscribe` pede. */
export function urlBase64ToUint8Array(base64Url: string): Uint8Array {
  const padding = '='.repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return Uint8Array.from(raw, (ch) => ch.charCodeAt(0));
}

/**
 * A inscrição foi feita com esta chave? Se o par do servidor mudou, a
 * inscrição antiga não recebe mais nada e precisa ser refeita.
 */
export function sameKeyBytes(a: ArrayBuffer | ArrayBufferView | null | undefined, b: Uint8Array): boolean {
  if (!a) return false;
  const bytes = a instanceof ArrayBuffer ? new Uint8Array(a) : new Uint8Array(a.buffer, a.byteOffset, a.byteLength);
  if (bytes.length !== b.length) return false;
  return bytes.every((v, i) => v === b[i]);
}
