'use client';

import { useRef, useState } from 'react';
import { FileText, Loader2, Plus, Trash2, TriangleAlert } from 'lucide-react';

export interface VoucherFileState {
  /** id local, só para o React. */
  id: string;
  filename: string;
  size: number;
  /** Preenchido quando o upload conclui. */
  url?: string;
  status: 'uploading' | 'reading' | 'done' | 'error';
  /** Quantos itens a leitura trouxe (status `done`). */
  itemCount?: number;
  /** Nº do pedido que a leitura encontrou neste voucher. */
  orderRef?: string | null;
  /** Mensagem de erro ou aviso de PDF ilegível. */
  message?: string;
}

interface Props {
  files: VoucherFileState[];
  disabled: boolean;
  onAdd: (files: File[]) => void;
  onRemove: (id: string) => void;
}

const isPdf = (file: File) => file.type === 'application/pdf';

/**
 * Área de anexo dos vouchers: arrastar/soltar ou clicar. Só apresentação —
 * upload e leitura ficam no diálogo, que é quem conhece a conversa.
 */
export function VoucherDropZone({ files, disabled, onAdd, onRemove }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  // Arquivo que não é PDF é descartado — mas em silêncio o atendente acha que
  // o anexo entrou. Conta os ignorados para dizer que não entrou.
  const [ignored, setIgnored] = useState(0);

  const pick = (list: FileList | null) => {
    const all = Array.from(list ?? []);
    const pdfs = all.filter(isPdf);
    setIgnored(all.length - pdfs.length);
    if (pdfs.length) onAdd(pdfs);
  };

  return (
    <div>
      <label className="text-[12px] font-medium text-zinc-700 dark:text-zinc-300">
        Vouchers em PDF
      </label>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (disabled) return;
          pick(e.dataTransfer.files);
        }}
        onClick={() => !disabled && inputRef.current?.click()}
        className={`mt-1.5 cursor-pointer rounded-md border border-dashed px-3 py-4 text-center transition-colors ${
          dragging
            ? 'border-primary bg-primary/5'
            : 'border-zinc-200 hover:border-primary/50 dark:border-zinc-800'
        } ${disabled ? 'pointer-events-none opacity-50' : ''}`}
      >
        <p className="flex items-center justify-center gap-1.5 text-[11px] text-zinc-500 dark:text-zinc-400">
          <Plus className="h-3.5 w-3.5" />
          Arraste os PDFs aqui ou clique para escolher
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          multiple
          hidden
          onChange={(e) => {
            pick(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      {ignored > 0 && (
        <p className="mt-1.5 text-[11px] text-amber-600 dark:text-amber-400">
          {ignored === 1
            ? '1 arquivo foi ignorado: aqui só entra PDF.'
            : `${ignored} arquivos foram ignorados: aqui só entra PDF.`}
        </p>
      )}

      {files.length > 0 && (
        <ul className="mt-2 space-y-1.5">
          {files.map((f) => (
            <li
              key={f.id}
              className="flex items-center gap-2 rounded-md border border-zinc-200 px-2.5 py-1.5 dark:border-zinc-800"
            >
              {f.status === 'uploading' || f.status === 'reading' ? (
                <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-zinc-400" />
              ) : f.status === 'error' ? (
                <TriangleAlert className="h-3.5 w-3.5 shrink-0 text-amber-500" />
              ) : (
                <FileText className="h-3.5 w-3.5 shrink-0 text-primary" />
              )}

              <div className="min-w-0 flex-1">
                <p className="truncate text-[11px] font-medium text-zinc-700 dark:text-zinc-200">
                  {f.filename}
                </p>
                <p className="truncate text-[10px] text-zinc-400">
                  {f.status === 'uploading' && 'enviando…'}
                  {f.status === 'reading' && 'lendo o voucher…'}
                  {f.status === 'done' &&
                    (f.message ??
                      `${f.itemCount ?? 0} ${f.itemCount === 1 ? 'item' : 'itens'}`)}
                  {f.status === 'error' && (f.message ?? 'falhou')}
                </p>
              </div>

              <button
                type="button"
                onClick={() => onRemove(f.id)}
                disabled={disabled}
                aria-label={`Remover ${f.filename}`}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-zinc-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-50 dark:hover:bg-red-900/20"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
