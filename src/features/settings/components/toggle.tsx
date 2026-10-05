'use client';

import { Switch } from '@/components/ui/switch';

/**
 * Interruptor das telas de Configurações. É só um apelido do `<Switch>` do
 * app, para todo liga/desliga ter a mesma aparência.
 */
export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  /** Nome do que está sendo ligado/desligado, para leitor de tela. */
  label?: string;
}) {
  return <Switch checked={checked} onChange={onChange} label={label} />;
}
