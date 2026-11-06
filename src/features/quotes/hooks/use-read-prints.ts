'use client';

import { useCallback, useState } from 'react';
import { useProposalPrints } from '@/features/proposals/hooks/use-proposal-prints';
import { proposalsService } from '@/features/proposals/services/proposals.service';
import { unreadPrintsNotice } from '@/features/proposals/lib/unread-prints';
import { getErrorMessage } from '@/lib/errors';
import type { QuotePreview } from '../types';

export type ReadPrintsResult =
  | { ok: true; preview: QuotePreview; notice: string | null }
  | { ok: false; message: string };

const REJECTED = 'Esse arquivo não serve: mande um print PNG, JPG ou WebP de até 10MB.';
const UPLOAD_FAILED = 'O print não subiu. Confere a conexão e tenta de novo.';
const READ_FAILED = 'Não consegui ler o print. Confere a imagem e tenta de novo.';

/**
 * Lê prints só para tirar itens (atualizar cotação): sobe, a IA lê e devolve
 * os itens. Os prints não ficam guardados na cotação.
 */
export function useReadPrints(conversationId: string) {
  const prints = useProposalPrints();
  const { add, uploadAll, remove } = prints;
  const [isReading, setIsReading] = useState(false);

  const read = useCallback(
    async (files: File[]): Promise<ReadPrintsResult> => {
      const ids = add(files);
      if (ids.length === 0) return { ok: false, message: REJECTED };
      setIsReading(true);
      try {
        const outcome = await uploadAll(ids);
        if (!outcome.ok) return { ok: false, message: UPLOAD_FAILED };
        const preview = await proposalsService.previewQuote({
          conversationId,
          checkoutUrl: '',
          mode: 'UPDATE',
          images: outcome.images,
        });
        const notice = unreadPrintsNotice(preview.unreadPrints, files.map((f) => f.name));
        return { ok: true, preview, notice };
      } catch (err: unknown) {
        return { ok: false, message: getErrorMessage(err, READ_FAILED) };
      } finally {
        ids.forEach(remove);
        setIsReading(false);
      }
    },
    [add, uploadAll, remove, conversationId],
  );

  return { read, isReading };
}
