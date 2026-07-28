'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { inboxService } from '../services/inbox.service';

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
        err?.response?.data?.message ||
          'Não foi possível reagir a esta mensagem.',
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex items-center gap-0.5 rounded-full border border-zinc-200 bg-white px-1 py-0.5 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
      {QUICK.map((emoji) => (
        <button
          key={emoji}
          type="button"
          onClick={() => react(emoji)}
          disabled={sending}
          className="rounded-full px-1 text-base leading-none transition-transform hover:scale-125 disabled:opacity-50"
          aria-label={`Reagir com ${emoji}`}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}
