'use client';

import { History } from 'lucide-react';
import type { ConversationBrief } from '../services/inbox.service';

type ConversationDividerProps = {
  brief: ConversationBrief;
  /** O atendimento em curso — o de baixo na timeline, não um do passado. */
  isCurrent: boolean;
};

function formatStart(startedAt: string): string {
  const date = new Date(startedAt);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Marca onde um atendimento termina e outro começa. Sem isso, a timeline
 * unificada cola uma conversa de meses atrás embaixo da de hoje e parece uma
 * conversa só.
 */
export function ConversationDivider({ brief, isCurrent }: ConversationDividerProps) {
  const startedAt = formatStart(brief.startedAt);
  const label = isCurrent ? 'Atendimento atual' : 'Atendimento anterior';

  return (
    <div className="flex items-center gap-2 py-3" role="separator">
      <div className="h-px min-w-3 flex-1 bg-foreground/10" />
      {/* Mesma pílula mono do separador de dia; quebra linha em tela estreita. */}
      <div className="flex min-w-0 flex-wrap items-center justify-center gap-x-1.5 gap-y-0.5 rounded-2xl bg-card px-3 py-1 font-mono text-xs tabular-nums text-muted-foreground">
        <History className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span className="font-sans font-semibold text-foreground/80">{label}</span>
        {brief.protocol && <span>· {brief.protocol}</span>}
        {startedAt && <span>· {startedAt}</span>}
        <span>· {brief.channelName}</span>
      </div>
      <div className="h-px min-w-3 flex-1 bg-foreground/10" />
    </div>
  );
}
