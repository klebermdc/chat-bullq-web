'use client';

import { useState } from 'react';
import type { Proposal } from '@/features/proposals/types';
import { QuoteListRow } from './quote-list-row';
import { QuoteUpdateDialog } from './quote-update-dialog';

/** Cotações de um cliente (card do funil e conversa), cada uma com o Atualizar. */
export function QuoteHistoryList({ quotes }: { quotes: readonly Proposal[] }) {
  const [updating, setUpdating] = useState<Proposal | null>(null);
  const now = new Date();
  return (
    <>
      <ul className="space-y-2">
        {quotes.map((quote) => (
          <QuoteListRow key={quote.id} quote={quote} now={now} onUpdate={setUpdating} />
        ))}
      </ul>
      {updating && <QuoteUpdateDialog proposal={updating} onClose={() => setUpdating(null)} />}
    </>
  );
}
