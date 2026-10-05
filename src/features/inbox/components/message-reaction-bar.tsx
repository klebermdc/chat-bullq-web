'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { inboxService } from '../services/inbox.service';
import { getErrorMessage } from '@/lib/errors';

const QUICK = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

interface Props {
  messageId: string;
}

/**
 * Aparece no hover da bolha. Só os 6 rápidos — o picker completo não entra
 * aqui para não competir com o painel do compositor.
 */
export function MessageReactionBar({ messageId }: Props) {
  const [sending, setSending] = useState(false);

  async function react(emoji: string) {
    if (sending) return;
    setSending(true);
    try {
      await inboxService.reactToMessage(messageId, emoji);
    } catch (err: any) {
      toast.error(
        getErrorMessage(err, 'Não foi possível reagir a esta mensagem.'),
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <div
      role="group"
      aria-label="Reagir à mensagem"
      className="flex items-center gap-0.5 rounded-full border border-border bg-popover px-1 py-0.5 shadow-elevated"
    >
      {QUICK.map((emoji) => (
        <button
          key={emoji}
          type="button"
          onClick={() => react(emoji)}
          disabled={sending}
          className="flex h-7 w-7 items-center justify-center rounded-full text-base leading-none transition-transform hover:scale-125 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 motion-reduce:hover:scale-100"
          aria-label={`Reagir com ${emoji}`}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}
