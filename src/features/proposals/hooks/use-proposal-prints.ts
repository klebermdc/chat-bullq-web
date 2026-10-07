'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { inboxService } from '@/features/inbox/services/inbox.service';
import { renamePastedFile } from '@/features/inbox/lib/attachment-intake';
import { acceptPrints, type PrintRejection } from '../lib/print-intake';
import type { ProposalImageInput } from '../types';

export type PrintStatus = 'idle' | 'uploading' | 'done' | 'error';

export interface PrintItem {
  id: string;
  file: File;
  /** Object URL da miniatura — revogado ao remover, limpar ou desmontar. */
  previewUrl: string;
  status: PrintStatus;
  /** 0..1 enquanto sobe. */
  progress: number;
  /** Preenchido depois do upload; na nova tentativa este print não sobe de novo. */
  uploaded: ProposalImageInput | null;
}

export type PrintUploadOutcome =
  | { ok: true; images: ProposalImageInput[] }
  | { ok: false; failedName: string; error: unknown };

function revokeAll(items: PrintItem[]) {
  items.forEach((item) => URL.revokeObjectURL(item.previewUrl));
}

/**
 * Prints anexados à proposta: fila com miniatura, recusas da última tentativa
 * de anexar e o upload em sequência na hora de enviar.
 */
export function useProposalPrints() {
  const [items, setItems] = useState<PrintItem[]>([]);
  const [rejected, setRejected] = useState<PrintRejection[]>([]);
  // Fonte da verdade síncrona: dois Ctrl+V seguidos e o loop de upload
  // precisam da lista atual sem esperar o próximo render.
  const itemsRef = useRef<PrintItem[]>([]);
  const seqRef = useRef(0);

  const commit = useCallback((next: PrintItem[]) => {
    itemsRef.current = next;
    setItems(next);
  }, []);

  const patch = useCallback(
    (id: string, changes: Partial<PrintItem>) => {
      commit(itemsRef.current.map((item) => (item.id === id ? { ...item, ...changes } : item)));
    },
    [commit],
  );

  /** Anexa o que passar na regra; devolve quantos entraram. */
  const add = useCallback(
    (incoming: File[]): number => {
      if (!incoming.length) return 0;
      const named = incoming.map((file) => renamePastedFile(file));
      const result = acceptPrints(named, itemsRef.current.length);
      setRejected(result.rejected);
      if (!result.accepted.length) return 0;
      const added: PrintItem[] = result.accepted.map((file) => ({
        id: `print-${(seqRef.current += 1)}`,
        file,
        previewUrl: URL.createObjectURL(file),
        status: 'idle',
        progress: 0,
        uploaded: null,
      }));
      commit([...itemsRef.current, ...added]);
      return added.length;
    },
    [commit],
  );

  const remove = useCallback(
    (id: string) => {
      const target = itemsRef.current.find((item) => item.id === id);
      if (!target) return;
      URL.revokeObjectURL(target.previewUrl);
      commit(itemsRef.current.filter((item) => item.id !== id));
    },
    [commit],
  );

  const clear = useCallback(() => {
    setRejected((prev) => (prev.length ? [] : prev));
    if (!itemsRef.current.length) return;
    revokeAll(itemsRef.current);
    commit([]);
  }, [commit]);

  const dismissRejected = useCallback(() => setRejected([]), []);

  /** Sobe um por vez, na ordem; para no primeiro que falhar. */
  const uploadAll = useCallback(async (): Promise<PrintUploadOutcome> => {
    const queue = itemsRef.current;
    const images: ProposalImageInput[] = [];
    for (const item of queue) {
      if (item.uploaded) {
        images.push(item.uploaded);
        continue;
      }
      patch(item.id, { status: 'uploading', progress: 0 });
      try {
        const upload = await inboxService.uploadMedia(item.file, (ratio) =>
          patch(item.id, { progress: ratio }),
        );
        const image: ProposalImageInput = {
          url: upload.url,
          mimeType: upload.mimeType || item.file.type,
          filename: upload.filename || item.file.name,
          size: upload.size ?? item.file.size,
        };
        patch(item.id, { status: 'done', progress: 1, uploaded: image });
        images.push(image);
      } catch (error) {
        patch(item.id, { status: 'error', progress: 0 });
        return { ok: false, failedName: item.file.name, error };
      }
    }
    return { ok: true, images };
  }, [patch]);

  // Saiu da tela com print na fila: solta as miniaturas da memória.
  useEffect(() => () => revokeAll(itemsRef.current), []);

  return { items, rejected, add, remove, clear, dismissRejected, uploadAll };
}
