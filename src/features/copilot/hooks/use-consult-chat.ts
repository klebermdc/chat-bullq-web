'use client';

import { useCallback, useRef, useState } from 'react';
import { consultCopilot, type ConsultContext, type ConsultTurn } from '../api';
import { getErrorMessage } from '@/lib/errors';

const FALLBACK_ERROR = 'Não consegui consultar agora. Tenta de novo.';

/** Estado de uma conversa com o Copiloto no modo Consulta (não persiste). */
export function useConsultChat(context: ConsultContext = {}) {
  const [turns, setTurns] = useState<ConsultTurn[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Evita duas perguntas ao mesmo tempo mesmo antes do re-render.
  const busy = useRef(false);
  // Histórico lido na hora do envio (o updater do setState roda depois).
  const turnsRef = useRef<ConsultTurn[]>([]);
  const { conversationId, messageId } = context;

  const send = useCallback(
    async (text: string) => {
      const q = text.trim();
      if (!q || busy.current) return;
      busy.current = true;
      setError(null);
      setLoading(true);
      const previous = turnsRef.current;
      const asked: ConsultTurn[] = [...previous, { role: 'user', content: q }];
      turnsRef.current = asked;
      setTurns(asked);
      try {
        const res = await consultCopilot(q, previous, { conversationId, messageId });
        const answered: ConsultTurn[] = [
          ...turnsRef.current,
          { role: 'assistant', content: res.reply, suggestion: res.suggestion },
        ];
        turnsRef.current = answered;
        setTurns(answered);
      } catch (e) {
        setError(getErrorMessage(e, FALLBACK_ERROR));
      } finally {
        busy.current = false;
        setLoading(false);
      }
    },
    [conversationId, messageId],
  );

  return { turns, loading, error, send };
}
