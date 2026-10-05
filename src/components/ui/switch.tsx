'use client';

import { cn } from '@/lib/utils';

/**
 * Interruptor único do app (ligado = cor primária). Anuncia o estado para
 * leitor de tela; `label` é obrigatório quando não há texto visível ligado
 * ao controle por `<label>`.
 */
interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

const TRACK = { sm: 'h-5 w-9', md: 'h-6 w-11' } as const;
const THUMB = { sm: 'h-4 w-4', md: 'h-5 w-5' } as const;
const ON = { sm: 'translate-x-[18px]', md: 'translate-x-[22px]' } as const;

export function Switch({ checked, onChange, label, disabled = false, size = 'md', className }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex shrink-0 items-center rounded-full transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        'disabled:cursor-not-allowed disabled:opacity-50',
        TRACK[size],
        checked ? 'bg-primary' : 'bg-zinc-400 dark:bg-zinc-500',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'inline-block rounded-full bg-white shadow transition-transform',
          THUMB[size],
          checked ? ON[size] : 'translate-x-0.5',
        )}
      />
    </button>
  );
}
