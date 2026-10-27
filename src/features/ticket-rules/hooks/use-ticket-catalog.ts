'use client';

import { useEffect, useState } from 'react';
import type { TicketCatalog } from '../types';

let cached: TicketCatalog | null = null;

/** A base (~190 KB) só carrega quando o editor da cotação abre, e uma vez só. */
export function useTicketCatalog(): TicketCatalog | null {
  const [catalog, setCatalog] = useState<TicketCatalog | null>(cached);
  useEffect(() => {
    if (cached) return;
    let alive = true;
    import('../data/ticket-rules.json')
      .then((mod) => {
        cached = mod.default as TicketCatalog;
        if (alive) setCatalog(cached);
      })
      .catch((err: unknown) => {
        // Sem a base o editor segue funcionando; só não mostra as regras.
        console.error('ticket_rules_load_failed', err);
      });
    return () => {
      alive = false;
    };
  }, []);
  return catalog;
}
