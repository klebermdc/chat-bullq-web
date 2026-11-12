'use client';

import { useCallback, useState } from 'react';
import { EMPTY_SUPPLIER_COMPARE, type SupplierCompareState } from '@/features/quotes/lib/supplier-compare';
import type { StoreOffer } from '@/features/quotes/types';
import { extractStoreLink } from '../lib/store-link';

interface StoreRead {
  link: string;
  offer: StoreOffer | null;
}

/**
 * Estado da cotação pelo carrinho da Just Travel no modal: o texto colado,
 * o link que já foi lido, os preços da loja e a comparação com a Azul.
 */
export function useStoreQuote() {
  const [text, setText] = useState('');
  const [read, setRead] = useState<StoreRead | null>(null);
  const [compare, setCompare] = useState<SupplierCompareState>(EMPTY_SUPPLIER_COMPARE);

  /** Link lido: guarda os preços da loja e recomeça a comparação. */
  const begin = useCallback((link: string, offer: StoreOffer | null) => {
    setRead({ link, offer });
    setCompare(EMPTY_SUPPLIER_COMPARE);
  }, []);
  /** A leitura deixou de valer (link trocado). O texto fica. */
  const forget = useCallback(() => {
    setRead(null);
    setCompare(EMPTY_SUPPLIER_COMPARE);
  }, []);
  const reset = useCallback(() => {
    setText('');
    forget();
  }, [forget]);

  return {
    text,
    setText,
    link: extractStoreLink(text),
    hasText: text.trim().length > 0,
    readLink: read?.link ?? null,
    offer: read?.offer ?? null,
    compare,
    setCompare,
    begin,
    forget,
    reset,
  };
}
