'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, ChevronUp, ChevronDown, Trash2 } from 'lucide-react';
import type { EditorBlock } from './editor-state';

const ROTULOS: Record<string, string> = {
  logo: 'Logo', heading: 'Título', text: 'Texto', image: 'Imagem',
  offer: 'Oferta', button: 'Botão', divider: 'Divisor', spacer: 'Espaço', social: 'Redes',
};

function resumo(b: EditorBlock): string {
  if ('text' in b && b.text) return b.text.slice(0, 40);
  if (b.type === 'offer') return b.title;
  if (b.type === 'button') return b.label;
  if (b.type === 'spacer') return { sm: 'pequeno', md: 'médio', lg: 'grande' }[b.size];
  return '';
}

interface Props {
  block: EditorBlock;
  selected: boolean;
  onSelect: () => void;
  onMove: (delta: number) => void;
  onRemove: () => void;
  children: React.ReactNode;
}

export function BlockItem({ block, selected, onSelect, onMove, onRemove, children }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
      className={`rounded-lg border ${selected ? 'border-primary ring-1 ring-primary' : ''}`}
    >
      <div className="flex items-center gap-2 p-2">
        <button
          {...attributes}
          {...listeners}
          aria-label="Arrastar bloco"
          className="cursor-grab text-muted-foreground"
        >
          <GripVertical className="h-4 w-4" />
        </button>

        <button onClick={onSelect} className="flex-1 text-left">
          <span className="text-sm font-medium">{ROTULOS[block.type]}</span>
          {resumo(block) && (
            <span className="ml-2 text-xs text-muted-foreground">{resumo(block)}</span>
          )}
        </button>

        {/* Setas não são fallback: arrastar no toque é ruim e teclado precisa
            de alternativa. */}
        <button onClick={() => onMove(-1)} aria-label="Mover para cima" className="text-muted-foreground hover:text-foreground">
          <ChevronUp className="h-4 w-4" />
        </button>
        <button onClick={() => onMove(1)} aria-label="Mover para baixo" className="text-muted-foreground hover:text-foreground">
          <ChevronDown className="h-4 w-4" />
        </button>
        <button onClick={onRemove} aria-label="Remover bloco" className="text-muted-foreground hover:text-red-500">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {selected && <div className="border-t p-3">{children}</div>}
    </div>
  );
}
