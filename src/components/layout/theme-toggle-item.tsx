'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Sun, Moon } from 'lucide-react';
import { DropdownItem, DropdownLabel } from '@/components/ui/dropdown';

/**
 * Item de menu que alterna entre tema claro e escuro.
 * Usa `resolvedTheme` para saber o tema atual (mesmo quando em "system").
 * O gate `mounted` evita mismatch de hidratação — no SSR/primeiro render
 * mostramos o estado padrão (claro → oferece "Tema escuro").
 */
export function ThemeToggleItem() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isDark = mounted && resolvedTheme === 'dark';

  return (
    <DropdownItem onClick={() => setTheme(isDark ? 'light' : 'dark')}>
      {isDark ? <Sun /> : <Moon />}
      <DropdownLabel>{isDark ? 'Tema claro' : 'Tema escuro'}</DropdownLabel>
    </DropdownItem>
  );
}
