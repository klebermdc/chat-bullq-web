'use client';

import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { X, Loader2, Plus, Trash2, Ticket } from 'lucide-react';
import { toast } from 'sonner';
import { pipelinesService } from '@/features/pipelines/services/pipelines.service';
import { orderFichaService } from '@/features/order-ficha/order-ficha.service';
import { inboxService } from '@/features/inbox/services/inbox.service';
import { acceptancesService } from '../services/acceptances.service';
import { mergeVoucherItems, pickOrderRef } from '../voucher-merge';
import { summarizeOrderSent } from '../voucher-send-summary';
import { VoucherDropZone, type VoucherFileState } from './voucher-drop-zone';
import type { AcceptanceItem } from '../types';

interface Props {
  conversationId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone?: () => void;
}

/**
 * Diálogo de Aceite de Entrega (E6 — Entrega): ao marcar "Pedido enviado", o
 * atendente confere/edita os itens entregues (rascunho vindo da Ficha do
 * Pedido) e um termo opcional, e então gera + envia o link de aceite ao
 * cliente. Segue o padrão de modal manual do WonDialog (o projeto não usa lib
 * de Dialog).
 */
export function AcceptanceDialog({
  conversationId,
  open,
  onOpenChange,
  onDone,
}: Props) {
  const queryClient = useQueryClient();
  const [items, setItems] = useState<AcceptanceItem[]>([]);
  const [term, setTerm] = useState('');
  const [saving, setSaving] = useState(false);
  const [loadingDraft, setLoadingDraft] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [files, setFiles] = useState<VoucherFileState[]>([]);
  // Ids que o atendente removeu enquanto a leitura ainda rodava. Sem isso, o
  // voucher descartado ("peguei o arquivo do cliente errado") ainda mescla os
  // itens dele na lista, minutos depois, sem nada na tela explicando de onde
  // vieram.
  const discardedFiles = useRef(new Set<string>());
  const fileSeq = useRef(0);

  // Ao abrir: parte de estado limpo e tenta puxar o rascunho da Ficha do Pedido.
  useEffect(() => {
    if (!open) return;
    setTerm('');
    setError(null);
    setSaving(false);
    setItems([]);
    setFiles([]);
    discardedFiles.current = new Set();
    let cancelled = false;
    setLoadingDraft(true);
    orderFichaService
      .getForConversation(conversationId)
      .then((ficha) => {
        if (cancelled) return;
        const draft: AcceptanceItem[] = (ficha?.items ?? []).map((it) => ({
          description: it.produto,
          qty: it.quantidade,
        }));
        setItems(draft);
      })
      .catch(() => {
        // Sem ficha / falha: começa vazio, o atendente adiciona à mão.
        if (!cancelled) setItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingDraft(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, conversationId]);

  // ESC fecha; trava o scroll do body enquanto aberto.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !saving) onOpenChange(false);
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onOpenChange, saving]);

  if (!open) return null;

  const addItem = () =>
    setItems((xs) => [...xs, { description: '' }]);
  const setDesc = (i: number, v: string) =>
    setItems((xs) => xs.map((x, k) => (k === i ? { ...x, description: v } : x)));
  const removeItem = (i: number) =>
    setItems((xs) => xs.filter((_, k) => k !== i));

  const hasItems = items.some((x) => x.description.trim());

  const busyWithFiles = files.some(
    (f) => f.status === 'uploading' || f.status === 'reading',
  );

  // Nº do pedido derivado dos vouchers que ainda estão anexados: remover o
  // arquivo errado tem que apagar o aviso de divergência junto.
  const { orderRef, conflict: refConflict } = pickOrderRef(
    files.map((f) => f.orderRef ?? null),
  );

  const patchFile = (id: string, next: Partial<VoucherFileState>) =>
    setFiles((xs) => xs.map((x) => (x.id === id ? { ...x, ...next } : x)));

  /**
   * Sobe cada PDF e já dispara a leitura. Cada arquivo é independente: um que
   * falha não impede os outros, e nenhum deles bloqueia o envio — o voucher
   * vai pro cliente mesmo sem a IA ter conseguido ler.
   */
  async function addFiles(picked: File[]) {
    const entries: VoucherFileState[] = picked.map((f) => ({
      id: `voucher-${++fileSeq.current}`,
      filename: f.name,
      size: f.size,
      status: 'uploading',
    }));
    setFiles((xs) => [...xs, ...entries]);

    await Promise.all(
      picked.map(async (file, i) => {
        const { id } = entries[i];
        try {
          const upload = await inboxService.uploadMedia(file);
          patchFile(id, { url: upload.url, size: upload.size, status: 'reading' });

          const result = await acceptancesService.extractVoucher(upload.url);
          if (discardedFiles.current.has(id)) return;
          setItems((xs) => mergeVoucherItems(xs, result.items));
          patchFile(id, {
            status: 'done',
            itemCount: result.items.length,
            orderRef: result.orderRef,
            // Aviso de PDF ilegível NÃO é erro: o arquivo já subiu e vai ao
            // cliente do mesmo jeito — o atendente só digita os itens à mão.
            message: result.warning,
          });
        } catch (err: any) {
          const msg = err?.response?.data?.message;
          patchFile(id, {
            status: 'error',
            message:
              (Array.isArray(msg) ? msg[0] : msg) ||
              err?.message ||
              'não consegui enviar este arquivo',
          });
        }
      }),
    );
  }

  const removeFile = (id: string) => {
    discardedFiles.current.add(id);
    setFiles((xs) => xs.filter((x) => x.id !== id));
  };

  async function submit(withAcceptance: boolean) {
    if (saving) return;
    setError(null);
    setSaving(true);
    try {
      const clean = items
        .filter((x) => x.description.trim())
        .map((x) => ({ ...x, description: x.description.trim() }));
      // Só arquivo que terminou o upload tem URL — o que falhou não tem o que
      // mandar, e mandar `undefined` viraria voucher fantasma no aceite.
      const vouchers = files
        .filter((f) => f.status === 'done' && f.url)
        .map((f) => ({
          url: f.url as string,
          filename: f.filename,
          size: f.size,
        }));

      const result = await pipelinesService.markOrderSent(
        conversationId,
        withAcceptance
          ? {
              withAcceptance: true,
              items: clean,
              termText: term.trim() || undefined,
              vouchers,
              orderRef: orderRef ?? undefined,
            }
          : { withAcceptance: false },
      );
      queryClient.invalidateQueries({ queryKey: ['pipelines'] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });

      const summary = summarizeOrderSent({
        withAcceptance,
        sentCount: withAcceptance ? vouchers.length : 0,
        results: result.voucherResults,
      });
      if (summary.kind === 'error') {
        // Cliente sem o voucher e ninguém sabendo é o pior desfecho possível:
        // o toast fica bem mais tempo na tela que um sucesso.
        toast.error(summary.message, { duration: 15000 });
      } else {
        toast.success(summary.message);
      }
      onOpenChange(false);
      onDone?.();
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setError(
        (Array.isArray(msg) ? msg[0] : msg) ||
          err?.message ||
          'Não foi possível concluir. Tente de novo.',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={() => !saving && onOpenChange(false)}
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950"
      >
        <div className="flex items-center justify-between gap-2 border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            <Ticket className="h-4 w-4 text-primary" />
            Aceite de entrega
          </h2>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={saving}
            aria-label="Fechar"
            className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 disabled:opacity-50 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
          <VoucherDropZone
            files={files}
            disabled={saving}
            onAdd={addFiles}
            onRemove={removeFile}
          />

          {refConflict && (
            <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
              Os vouchers anexados são de pedidos diferentes. Confira se algum
              arquivo é de outro cliente antes de enviar.
            </p>
          )}

          <div>
            <div className="flex items-center justify-between">
              <label className="text-[12px] font-medium text-zinc-700 dark:text-zinc-300">
                Itens entregues
              </label>
              <button
                type="button"
                onClick={addItem}
                disabled={saving}
                className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-primary hover:bg-primary/10 disabled:opacity-50"
              >
                <Plus className="h-3.5 w-3.5" /> Adicionar item
              </button>
            </div>

            {loadingDraft ? (
              <div className="mt-2 flex items-center gap-2 text-xs text-zinc-400">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Carregando itens
                da ficha…
              </div>
            ) : items.length === 0 ? (
              <p className="mt-2 rounded-md border border-dashed border-zinc-200 px-3 py-3 text-center text-[11px] text-zinc-400 dark:border-zinc-800">
                Nenhum item ainda. Clique em "Adicionar item" para incluir o que
                foi entregue.
              </p>
            ) : (
              <div className="mt-2 space-y-2">
                {items.map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      value={item.description}
                      onChange={(e) => setDesc(i, e.target.value)}
                      disabled={saving}
                      placeholder="Ex.: 2x ingresso Magic Kingdom"
                      className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm outline-none transition-colors placeholder:text-zinc-400 focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                    />
                    <button
                      type="button"
                      onClick={() => removeItem(i)}
                      disabled={saving}
                      aria-label="Remover item"
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-zinc-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-50 dark:hover:bg-red-900/20"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="text-[12px] font-medium text-zinc-700 dark:text-zinc-300">
              Termo de aceite (opcional)
            </label>
            <textarea
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              disabled={saving}
              rows={4}
              placeholder="Deixe em branco para usar o termo padrão."
              className="mt-1.5 w-full resize-none rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm outline-none transition-colors placeholder:text-zinc-400 focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
          </div>

          {error && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </p>
          )}
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-zinc-100 px-4 py-3 dark:border-zinc-800">
          <button
            type="button"
            onClick={() => submit(false)}
            disabled={saving}
            className="rounded-md px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-100 disabled:opacity-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Só marcar enviado
          </button>
          <button
            type="button"
            onClick={() => submit(true)}
            disabled={saving || busyWithFiles || !hasItems}
            className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Gerar aceite e enviar
          </button>
        </div>
      </div>
    </div>
  );
}
