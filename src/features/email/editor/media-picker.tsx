'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, Image as ImageIcon } from 'lucide-react';
import { mediaLibraryService } from '@/features/media-library/services/media-library.service';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { EmptyState, LoadingState } from '@/components/ui/empty-state';
import { fieldLabelClass, inputClass } from './style-controls';

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
      <label htmlFor={id} className={fieldLabelClass}>
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Cole uma URL ou escolha da biblioteca"
          className={`${inputClass} min-w-0`}
        />
        <Button type="button" variant="outline" onClick={() => setOpen(true)} className="shrink-0 px-3">
          <ImageIcon aria-hidden="true" className="h-4 w-4" />
          Biblioteca
        </Button>
      </div>

      {value && (
        // eslint-disable-next-line @next/next/no-img-element -- prévia de URL arbitrária, não um asset do build
        <img
          src={value}
          alt=""
          className="h-16 w-auto rounded-lg border border-border object-contain"
        />
      )}

      <MediaPickerDialog
        open={open}
        onClose={() => setOpen(false)}
        onSelect={(url) => {
          onChange(url);
          setOpen(false);
        }}
      />
    </div>
  );
}

function MediaPickerDialog({
  open,
  onClose,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (url: string) => void;
}) {
  // Só busca com o diálogo aberto — como antes, quando ele só era montado ao abrir.
  const assets = useQuery({
    queryKey: ['media-library', 'assets', 'all'],
    queryFn: () => mediaLibraryService.listAssets(),
    enabled: open,
  });

  const images = (assets.data ?? []).filter((a) => a.mimeType.startsWith('image/'));

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Biblioteca de arquivos"
      description="Escolha uma imagem já enviada para usar neste bloco."
      size="lg"
    >
      {assets.isLoading && <LoadingState />}
      {assets.isError && (
        <p role="alert" className="flex items-center justify-center gap-2 py-6 text-sm text-urgent-ink">
          <AlertCircle aria-hidden="true" className="h-4 w-4 shrink-0" />
          Não foi possível carregar a biblioteca. Feche e tente novamente.
        </p>
      )}
      {!assets.isLoading && !assets.isError && images.length === 0 && (
        <EmptyState
          icon={ImageIcon}
          title="Nenhuma imagem na biblioteca ainda"
          description="Enquanto isso, cole a URL da imagem direto no campo."
          size="sm"
        />
      )}
      {images.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {images.map((asset) => (
            <button
              key={asset.id}
              type="button"
              onClick={() => onSelect(asset.url)}
              title={asset.title || asset.filename}
              className="overflow-hidden rounded-lg border border-border transition-shadow hover:ring-2 hover:ring-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- asset já hospedado, sem otimização do Next */}
              <img
                src={asset.url}
                alt={asset.title || asset.filename}
                className="h-24 w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </Dialog>
  );
}
