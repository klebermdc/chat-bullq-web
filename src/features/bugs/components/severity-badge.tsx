'use client';

import { cn } from '@/lib/utils';
import type { ErrorSeverity, ErrorSource } from '../services/bugs.service';

/**
 * Cor por severidade. Vermelho é reservado ao CRÍTICO — o que significa
 * "cliente perdeu mensagem ou sistema fora". Se tudo for vermelho, nada é.
 *
 * Não usa o <Badge> de src/components/ui/badge.tsx: seus variants (neutral,
 * brand, hot, success, info) não cobrem os três degraus de severidade que
 * precisamos aqui. Usa os pares de lavagem/tinta de estado: urgente para
 * CRITICAL, atenção para ERROR e neutro para WARNING — sempre com a palavra.
 */
const SEVERITY: Record<ErrorSeverity, { label: string; className: string }> = {
  CRITICAL: {
    label: 'Crítico',
    className: 'bg-urgent-wash text-urgent-ink',
  },
  ERROR: {
    label: 'Erro',
    className: 'bg-warning-wash text-warning-ink',
  },
  WARNING: {
    label: 'Aviso',
    className: 'bg-muted text-foreground',
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
        'inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-medium',
        className,
      )}
    >
      {label}
    </span>
  );
}

export function SourceBadge({ source }: { source: ErrorSource }) {
  return (
    <span className="inline-flex shrink-0 items-center rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
      {SOURCE[source]}
    </span>
  );
}
