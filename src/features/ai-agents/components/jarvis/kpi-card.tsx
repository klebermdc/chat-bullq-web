'use client';

import type { LucideIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/ui/stat-card';

export type KpiState = 'success' | 'warning' | 'urgent' | 'neutral';

const STATE_BADGE: Record<KpiState, string> = {
  success: 'bg-success-wash text-success-ink',
  warning: 'bg-warning-wash text-warning-ink',
  urgent: 'bg-urgent-wash text-urgent-ink',
  neutral: 'bg-muted text-muted-foreground',
};

const HEALTHY_SUCCESS_RATE = 90;
const WARNING_SUCCESS_RATE = 70;

/** Taxa de sucesso (%) → estado com palavra. Sem dado, sem selo. */
export function successRateState(rate: number | null | undefined): KpiCardProps['state'] {
  if (rate == null) return undefined;
  if (rate > HEALTHY_SUCCESS_RATE) return { label: 'Saudável', tone: 'success' };
  if (rate > WARNING_SUCCESS_RATE) return { label: 'Atenção', tone: 'warning' };
  return { label: 'Crítico', tone: 'urgent' };
}

interface KpiCardProps {
  label: string;
  value: string | number;
  hint?: string;
  icon?: LucideIcon;
  /**
   * Estado do indicador, sempre com palavra ("Saudável", "Atenção"). O número
   * fica na cor do texto; quem carrega o estado é este selo, no lugar do ícone.
   */
  state?: { label: string; tone: KpiState };
}

/**
 * Indicador das abas do Jarvis: o `<StatCard>` do app, com o selo de estado
 * no canto quando há estado.
 */
export function KpiCard({ label, value, hint, icon, state }: KpiCardProps) {
  const text = typeof value === 'number' ? value.toLocaleString('pt-BR') : value;
  return (
    <StatCard
      label={label}
      value={text}
      hint={hint}
      icon={icon}
      className="h-full"
      badge={state ? <Badge className={STATE_BADGE[state.tone]}>{state.label}</Badge> : undefined}
    />
  );
}
