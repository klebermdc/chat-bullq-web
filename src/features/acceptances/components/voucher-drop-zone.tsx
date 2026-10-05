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
  /**
   * `done` = está no storage e vai ao cliente. Não há estado de leitura: o
   * anexo é enviado, nunca interpretado.
   */
  status: 'uploading' | 'done' | 'error';
  /** Por que o upload falhou (status `error`). */
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
 * Área de anexo dos vouchers: arrastar/soltar ou clicar. Só apresentação — o
 * upload fica no diálogo, que é quem conhece a conversa.
 *
 * A linha de apoio diz que o arquivo vai para o cliente porque a interface
 * antiga não dizia: o atendente anexava aqui E mandava o mesmo PDF pelo chat, e
 * o cliente recebia o voucher duas vezes.
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
      <p className="text-sm font-medium text-foreground">Vouchers em PDF</p>
      <p className="mt-0.5 text-xs text-muted-foreground">
        Os arquivos anexados aqui vão para o cliente junto com o link de aceite —
        não precisa mandar pelo chat.
      </p>

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
        // Teclado: a área é clicável, então também responde a Enter/Espaço.
        role="button"
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => {
          if (disabled || (e.key !== 'Enter' && e.key !== ' ')) return;
          e.preventDefault();
          inputRef.current?.click();
        }}
        className={`mt-1.5 cursor-pointer rounded-lg border border-dashed px-3 py-4 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
          dragging
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-primary/50'
        } ${disabled ? 'pointer-events-none opacity-50' : ''}`}
      >
        <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <Plus aria-hidden="true" className="h-3.5 w-3.5" />
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
        <p role="status" className="mt-1.5 text-xs text-warning-ink">
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
              className="flex items-center gap-2 rounded-lg border border-border px-2.5 py-1.5"
            >
              {f.status === 'uploading' ? (
                <Loader2 aria-hidden="true" className="h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground" />
              ) : f.status === 'error' ? (
                <TriangleAlert aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-warning-ink" />
              ) : (
                <FileText aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-primary" />
              )}

              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-foreground">
                  {f.filename}
                </p>
                <p
                  className={`truncate text-[11px] ${
                    f.status === 'error' ? 'text-warning-ink' : 'text-muted-foreground'
                  }`}
                >
                  {f.status === 'uploading' && 'Enviando…'}
                  {f.status === 'done' && 'Anexado — vai para o cliente'}
                  {f.status === 'error' && (f.message ?? 'Falhou')}
                </p>
              </div>

              <button
                type="button"
                onClick={() => onRemove(f.id)}
                disabled={disabled}
                aria-label={`Remover ${f.filename}`}
                title="Remover anexo"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-urgent-wash hover:text-urgent-ink disabled:opacity-50"
              >
                <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
