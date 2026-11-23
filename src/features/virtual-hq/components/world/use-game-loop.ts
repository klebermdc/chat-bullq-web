'use client';

import { useEffect, useLayoutEffect, useRef } from 'react';

/** Passo máximo por quadro: depois de uma pausa o boneco não "teleporta". */
const MAX_DT = 0.1;

/**
 * Um único requestAnimationFrame para o mapa todo. Para quando a aba fica
 * escondida e volta sozinho quando ela reaparece.
 */
export function useGameLoop(onFrame: (dt: number, time: number) => void) {
  const callback = useRef(onFrame);
  useLayoutEffect(() => {
    callback.current = onFrame;
  });

  useEffect(() => {
    let raf = 0;
    let last = 0;
    const tick = (now: number) => {
      const dt = Math.min(MAX_DT, Math.max(0, (now - last) / 1000));
      last = now;
      try {
        callback.current(dt, now);
      } catch (err) {
        console.error('[escritorio] falha ao desenhar o quadro', err);
      }
      raf = requestAnimationFrame(tick);
    };
    const start = () => {
      if (raf) return;
      last = performance.now();
      raf = requestAnimationFrame(tick);
    };
    const stop = () => {
      cancelAnimationFrame(raf);
      raf = 0;
    };
    const onVisibility = () => (document.hidden ? stop() : start());
    if (!document.hidden) start();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);
}
