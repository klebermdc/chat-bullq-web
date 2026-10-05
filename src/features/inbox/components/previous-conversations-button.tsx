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
    <div className="flex flex-col items-center gap-1.5 py-3">
      <button
        type="button"
        onClick={onClick}
        disabled={isLoading}
        className="flex min-h-9 items-center gap-2 rounded-full bg-card px-4 py-2 text-[13px] font-semibold text-foreground shadow-soft transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <History className="h-4 w-4" aria-hidden="true" />
        )}
        Ver {count} conversa{plural ? 's' : ''} anterior{plural ? 'es' : ''}
        {since ? ` · desde ${since}` : ''}
      </button>

      {hiddenByChannelAccess > 0 && (
        <span className="text-xs text-muted-foreground">
          {hiddenByChannelAccess} atendimento{hiddenByChannelAccess > 1 ? 's' : ''} em
          canais sem seu acesso {hiddenByChannelAccess > 1 ? 'ficaram' : 'ficou'} de fora
        </span>
      )}
    </div>
  );
}
