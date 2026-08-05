'use client';

import { useEffect, useRef, useState } from 'react';
import { emailApi } from '@/lib/email-api';
import { extractErrorMessage } from './error-message';

const ATRASO_MS = 400;
const PREVIEW_FALLBACK_ERROR = 'Não foi possível gerar a prévia.';

/**
 * Renderiza no servidor com atraso curto.
 *
 * Mantém o ÚLTIMO HTML válido quando a chamada falha: tela branca faria o
 * operador achar que perdeu o trabalho. Os blocos vivem no navegador; só a
 * prévia depende do servidor.
 */
export function usePreview(content: unknown, preheader?: string) {
  const [html, setHtml] = useState('');
  const [stale, setStale] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const geracao = useRef(0);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const minha = ++geracao.current;
      setLoading(true);
      try {
        const { html: novo } = await emailApi.preview(content, preheader);
        // Descarta resposta de requisição antiga que chegou fora de ordem.
        if (minha !== geracao.current) return;
        setHtml(novo);
        setStale(false);
        setError(null);
      } catch (err) {
        if (minha !== geracao.current) return;
        setStale(true);
        // A API devolve "bloco N: motivo" — mostrar isso em vez de um aviso
        // genérico é o que permite ao operador achar o campo vazio sozinho.
        setError(extractErrorMessage(err, PREVIEW_FALLBACK_ERROR));
      } finally {
        if (minha === geracao.current) setLoading(false);
      }
    }, ATRASO_MS);

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [JSON.stringify(content), preheader]);

  return { html, stale, loading, error };
}
