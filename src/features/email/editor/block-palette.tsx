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
    <div className="grid grid-cols-3 gap-2">
      {BLOCOS.map(({ type, label, icon: Icon }) => (
        <button
          key={type}
          onClick={() => onAdd(type)}
          className="flex flex-col items-center gap-1 rounded-lg border p-2 text-xs hover:bg-muted"
        >
          <Icon className="h-4 w-4" />
          {label}
        </button>
      ))}
    </div>
  );
}
