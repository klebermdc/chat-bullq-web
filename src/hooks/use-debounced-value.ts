'use client';

import { useEffect, useState } from 'react';

/**
 * Devolve `value`, mas só depois de `delayMs` sem mudar de novo. Usado para
 * não disparar a contagem de público a cada tecla enquanto o operador monta
 * o filtro.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
