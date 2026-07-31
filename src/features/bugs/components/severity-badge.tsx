'use client';

import { cn } from '@/lib/utils';
import type { ErrorSeverity, ErrorSource } from '../services/bugs.service';

/**
 * Cor por severidade. Vermelho é reservado ao CRÍTICO — o que significa
 * "cliente perdeu mensagem ou sistema fora". Se tudo for vermelho, nada é.
 *
 * Não usa o <Badge> de src/components/ui/badge.tsx: seus variants (neutral,
 * brand, hot, success, info) não cobrem os três degraus de severidade que
 * precisamos aqui (falta vermelho para CRITICAL e laranja para ERROR).
 */
const SEVERITY: Record<ErrorSeverity, { label: string; className: string }> = {
  CRITICAL: {
    label: 'Crítico',
    className: 'bg-red-500/15 text-red-600 dark:text-red-400',
  },
  ERROR: {
    label: 'Erro',
    className: 'bg-orange-500/15 text-orange-600 dark:text-orange-400',
  },
  WARNING: {
    label: 'Aviso',
    className: 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-400',
  },
};

const SOURCE: Record<ErrorSource, string> = {
  API: 'API',
  CHANNEL: 'Canal',
  AI: 'IA',
  JOB: 'Job',
};

export function SeverityBadge({ severity }: { severity: ErrorSeverity }) {
  const { label, className } = SEVERITY[severity];
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium',
        className,
      )}
    >
      {label}
    </span>
  );
}

export function SourceBadge({ source }: { source: ErrorSource }) {
  return (
    <span className="inline-flex shrink-0 items-center rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
      {SOURCE[source]}
    </span>
  );
}
