'use client';

import { useEffect, useRef } from 'react';
import { markPublicQuoteViewed } from '../../services/public-quotes.service';

/**
 * Avisa a API que o cliente abriu a página ("cliente abriu" do vendedor).
 * Roda só no navegador: o render no servidor e o robô de prévia do WhatsApp
 * não executam JS, então não contam como visita. Uma vez por montagem (o ref
 * segura o efeito duplo do StrictMode em dev).
 */
export function QuoteViewBeacon({ token }: { token: string }) {
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    markPublicQuoteViewed(token).catch(() => {
      // Falha aqui só perde uma contagem; o cliente não deve ver erro por isso.
    });
  }, [token]);
  return null;
}
