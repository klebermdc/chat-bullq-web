'use client';

import { useEffect } from 'react';

/**
 * Registra o service worker em produção (best-effort). Falha silenciosa em
 * navegadores sem suporte — o app funciona normal (progressive enhancement).
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (!('serviceWorker' in navigator)) return;
    const onLoad = () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // Registro falhou — sem PWA, mas o app segue funcionando.
      });
    };
    window.addEventListener('load', onLoad);
    return () => window.removeEventListener('load', onLoad);
  }, []);

  return null;
}
