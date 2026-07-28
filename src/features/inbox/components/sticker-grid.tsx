'use client';

import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import {
  mediaLibraryService,
  type MediaAsset,
} from '@/features/media-library/services/media-library.service';

interface Props {
  onPick: (asset: MediaAsset) => void;
}

/**
 * Só lista e devolve a escolha — quem envia é o compositor.
 */
export function StickerGrid({ onPick }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ['media-library', 'stickers'],
    queryFn: () => mediaLibraryService.listStickers(),
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="flex h-[340px] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data?.length) {
    return (
      <div className="flex h-[340px] flex-col items-center justify-center gap-1 px-6 text-center">
        <p className="text-sm font-medium text-foreground">
          Nenhuma figurinha ainda
        </p>
        <p className="text-xs text-muted-foreground">
          Crie uma pasta marcada como “de figurinhas” na Biblioteca de arquivos e
          suba arquivos .webp nela.
        </p>
      </div>
    );
  }

  return (
    <div className="grid h-[340px] grid-cols-4 gap-2 overflow-y-auto p-3">
      {data.map((asset) => (
        <button
          key={asset.id}
          type="button"
          onClick={() => onPick(asset)}
          className="flex aspect-square items-center justify-center rounded-lg p-1 hover:bg-muted"
          title={asset.title || asset.filename}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={asset.url}
            alt={asset.title || asset.filename}
            className="max-h-full max-w-full object-contain"
            loading="lazy"
          />
        </button>
      ))}
    </div>
  );
}
