'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Image as ImageIcon, X } from 'lucide-react';
import { mediaLibraryService } from '@/features/media-library/services/media-library.service';
import { inputClass } from './style-controls';

interface Props {
  id: string;
  label: string;
  value: string;
  onChange: (url: string) => void;
}

/**
 * Campo de imagem do editor de blocos: URL livre (para colar um link já
 * hospedado) mais um botão que abre a biblioteca de mídia existente do app
 * (`/media-library/assets`) para escolher um arquivo já enviado.
 *
 * A biblioteca não tinha, no momento desta implementação, um componente de
 * seleção reutilizável fora do contexto de conversa — `MediaLibraryDialog`
 * (`src/features/media-library/components/media-library-dialog.tsx`) exige
 * `conversationId` e serve para ENVIAR mídia a um cliente, não para escolher
 * uma URL. Este componente reusa o `mediaLibraryService` (a camada de dados)
 * e implementa apenas a lista + seleção mínima que faltava.
 */
export function MediaPicker({ id, label, value, onChange }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Cole uma URL ou escolha da biblioteca"
          className={inputClass}
        />
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex shrink-0 items-center gap-1 rounded-lg border border-zinc-300 px-3 py-2 text-xs font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          <ImageIcon className="h-3.5 w-3.5" />
          Biblioteca
        </button>
      </div>

      {value && (
        // eslint-disable-next-line @next/next/no-img-element -- prévia de URL arbitrária, não um asset do build
        <img
          src={value}
          alt=""
          className="h-16 w-auto rounded-md border border-zinc-200 object-contain dark:border-zinc-700"
        />
      )}

      {open && (
        <MediaPickerDialog
          onClose={() => setOpen(false)}
          onSelect={(url) => {
            onChange(url);
            setOpen(false);
          }}
        />
      )}
    </div>
  );
}

function MediaPickerDialog({
  onClose,
  onSelect,
}: {
  onClose: () => void;
  onSelect: (url: string) => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  const assets = useQuery({
    queryKey: ['media-library', 'assets', 'all'],
    queryFn: () => mediaLibraryService.listAssets(),
  });

  const images = (assets.data ?? []).filter((a) => a.mimeType.startsWith('image/'));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Escolher imagem da biblioteca"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[80vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950"
      >
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Biblioteca de arquivos
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="rounded-md p-1 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid flex-1 grid-cols-3 gap-2 overflow-y-auto p-4">
          {assets.isLoading && (
            <p className="col-span-full py-6 text-center text-sm text-zinc-500">Carregando…</p>
          )}
          {assets.isError && (
            <p className="col-span-full py-6 text-center text-sm text-red-500">
              Erro ao carregar a biblioteca. Tente novamente.
            </p>
          )}
          {!assets.isLoading && !assets.isError && images.length === 0 && (
            <p className="col-span-full py-6 text-center text-sm text-zinc-500">
              Nenhuma imagem na biblioteca ainda.
            </p>
          )}
          {images.map((asset) => (
            <button
              key={asset.id}
              type="button"
              onClick={() => onSelect(asset.url)}
              title={asset.title || asset.filename}
              className="overflow-hidden rounded-lg border border-zinc-200 hover:ring-2 hover:ring-primary dark:border-zinc-700"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- asset já hospedado, sem otimização do Next */}
              <img
                src={asset.url}
                alt={asset.title || asset.filename}
                className="h-20 w-full object-cover"
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
