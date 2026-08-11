'use client';

import { History, Loader2 } from 'lucide-react';

type PreviousConversationsButtonProps = {
  count: number;
  oldestAt: string | null;
  /** Atendimentos que existem mas o usuário não pode ver por canal. */
  hiddenByChannelAccess: number;
  isLoading: boolean;
  onClick: () => void;
};

function formatOldest(oldestAt: string | null): string | null {
  if (!oldestAt) return null;
  const date = new Date(oldestAt);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

/**
 * Porta de entrada do histórico do cliente. Aparece no topo só depois que a
 * conversa atual foi carregada inteira — antes disso "conversas anteriores"
 * seria ambíguo com "mensagens anteriores desta conversa".
 */
export function PreviousConversationsButton({
  count,
  oldestAt,
  hiddenByChannelAccess,
  isLoading,
  onClick,
}: PreviousConversationsButtonProps) {
  const since = formatOldest(oldestAt);
  const plural = count > 1;

  return (
    <div className="flex flex-col items-center gap-1 py-3">
      <button
        type="button"
        onClick={onClick}
        disabled={isLoading}
        className="flex items-center gap-2 rounded-full border border-border bg-muted px-4 py-1.5 text-[12px] font-medium text-foreground transition-opacity hover:opacity-80 disabled:opacity-60"
      >
        {isLoading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
        ) : (
          <History className="h-3.5 w-3.5" aria-hidden="true" />
        )}
        Ver {count} conversa{plural ? 's' : ''} anterior{plural ? 'es' : ''}
        {since ? ` · desde ${since}` : ''}
      </button>

      {hiddenByChannelAccess > 0 && (
        <span className="text-[11px] text-muted-foreground">
          {hiddenByChannelAccess} atendimento{hiddenByChannelAccess > 1 ? 's' : ''} em
          canais sem seu acesso {hiddenByChannelAccess > 1 ? 'ficaram' : 'ficou'} de fora
        </span>
      )}
    </div>
  );
}
