'use client';

import { LocateFixed, Minus, Plus } from 'lucide-react';
import { MAX_ZOOM, MIN_ZOOM } from '../../lib/world/camera';

interface ZoomControlsProps {
  zoom: number;
  onZoom: (delta: number) => void;
  onRecenter: () => void;
}

const btn =
  'grid size-8 place-items-center rounded-md border border-black/40 bg-[#fbf7ee] text-[#2a2233] shadow-sm ' +
  'hover:bg-white disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-ring';

export function ZoomControls({ zoom, onZoom, onRecenter }: ZoomControlsProps) {
  return (
    <div className="absolute right-2 top-2 flex flex-col gap-1.5">
      <button type="button" className={btn} onClick={() => onZoom(1)} disabled={zoom >= MAX_ZOOM} aria-label="Aproximar">
        <Plus className="size-4" aria-hidden />
      </button>
      <button type="button" className={btn} onClick={() => onZoom(-1)} disabled={zoom <= MIN_ZOOM} aria-label="Afastar">
        <Minus className="size-4" aria-hidden />
      </button>
      <button type="button" className={btn} onClick={onRecenter} aria-label="Voltar para mim">
        <LocateFixed className="size-4" aria-hidden />
      </button>
    </div>
  );
}
