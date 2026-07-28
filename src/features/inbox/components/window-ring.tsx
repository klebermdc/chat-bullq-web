'use client';

import type { ReactNode } from 'react';
import type { WindowKind } from '../lib/window-state';

const H = 60 * 60 * 1000;

/** Quanto dura a janela inteira, por regra — base da fração do arco. */
export function windowTotalMs(kind: WindowKind | null): number {
  return kind === 'ctwa72' ? 72 * H : 24 * H;
}

export type WindowUrgency = 'calm' | 'tight' | 'closing';

/** Verde acima de 6h, âmbar abaixo, vermelho na última hora. */
export function windowUrgency(msLeft: number): WindowUrgency {
  if (msLeft <= 1 * H) return 'closing';
  if (msLeft <= 6 * H) return 'tight';
  return 'calm';
}

const ARC_COLOR: Record<WindowUrgency, string> = {
  calm: 'var(--color-success)',
  tight: 'var(--color-warning)',
  closing: 'var(--color-urgent)',
};

/** "22h" / "3h10" / "42min" — curto o bastante para caber ao lado do nome. */
export function formatWindowLeft(ms: number): string {
  const totalMin = Math.floor(ms / 60000);
  if (totalMin < 60) return `${totalMin}min`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h >= 10 || m === 0) return `${h}h`;
  return `${h}h${String(m).padStart(2, '0')}`;
}

interface Props {
  /** Tempo restante da janela. null = a conversa não tem janela (canal não oficial). */
  msLeft: number | null;
  kind: WindowKind | null;
  children: ReactNode;
}

/**
 * Anel que envolve o avatar e esvazia junto com a janela do WhatsApp.
 *
 * Só aparece onde existe janela — ou seja, canal oficial da Meta. Nos canais
 * não oficiais não há restrição de 24h, então o avatar fica limpo: um anel
 * sempre cheio ali seria decoração dizendo o que não é verdade.
 */
export function WindowRing({ msLeft, kind, children }: Props) {
  if (msLeft === null || msLeft <= 0) return <>{children}</>;

  const total = windowTotalMs(kind);
  const fraction = Math.max(0, Math.min(1, msLeft / total));
  const urgency = windowUrgency(msLeft);
  const r = 22;
  const circumference = 2 * Math.PI * r;

  return (
    <div className="relative">
      <svg
        viewBox="0 0 48 48"
        aria-hidden="true"
        className="pointer-events-none absolute -inset-[4px] h-12 w-12 -rotate-90"
      >
        <circle
          cx="24"
          cy="24"
          r={r}
          fill="none"
          strokeWidth="2"
          className="stroke-zinc-200 dark:stroke-zinc-700"
        />
        <circle
          cx="24"
          cy="24"
          r={r}
          fill="none"
          strokeWidth="2"
          strokeLinecap="round"
          stroke={ARC_COLOR[urgency]}
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - fraction)}
        />
      </svg>
      {children}
    </div>
  );
}
