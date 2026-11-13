'use client';

import { useCallback, useSyncExternalStore } from 'react';

/** Breakpoints do Tailwind usados pela tela. */
export const SM_UP_QUERY = '(min-width: 640px)';
export const MD_UP_QUERY = '(min-width: 768px)';

/** `true` quando a media query casa; `false` no servidor e antes de hidratar. */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mediaQueryList = window.matchMedia(query);
      mediaQueryList.addEventListener('change', onChange);
      return () => mediaQueryList.removeEventListener('change', onChange);
    },
    [query],
  );

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}
