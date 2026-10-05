'use client';

import { Heading1, Type, Image, MousePointerClick, Minus, Sparkles, MoveVertical, Tag, Share2 } from 'lucide-react';
import type { BlockType } from './editor-state';

const BLOCOS: Array<{ type: BlockType; label: string; icon: typeof Type }> = [
  { type: 'logo', label: 'Logo', icon: Sparkles },
  { type: 'heading', label: 'Título', icon: Heading1 },
  { type: 'text', label: 'Texto', icon: Type },
  { type: 'image', label: 'Imagem', icon: Image },
  { type: 'offer', label: 'Oferta', icon: Tag },
  { type: 'button', label: 'Botão', icon: MousePointerClick },
  { type: 'divider', label: 'Divisor', icon: Minus },
  { type: 'spacer', label: 'Espaço', icon: MoveVertical },
  { type: 'social', label: 'Redes', icon: Share2 },
];

export function BlockPalette({ onAdd }: { onAdd: (t: BlockType) => void }) {
  return (
    <div className="grid grid-cols-3 gap-2" role="group" aria-label="Adicionar bloco">
      {BLOCOS.map(({ type, label, icon: Icon }) => (
        <button
          key={type}
          type="button"
          onClick={() => onAdd(type)}
          className="flex min-h-12 flex-col items-center justify-center gap-1 rounded-lg border border-border p-2 text-xs font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Icon aria-hidden="true" className="h-4 w-4 text-muted-foreground" />
          {label}
        </button>
      ))}
    </div>
  );
}
