'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, ChevronUp, ChevronDown, Trash2 } from 'lucide-react';
import type { EditorBlock } from './editor-state';
import { cn } from '@/lib/utils';

const iconBtnCls =
  'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

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
      className={cn(
        'rounded-xl border bg-card shadow-soft',
        selected ? 'border-primary ring-1 ring-primary' : 'border-border',
      )}
    >
      <div className="flex items-center gap-1 p-2">
        <button
          {...attributes}
          {...listeners}
          type="button"
          aria-label="Arrastar bloco"
          title="Arrastar bloco"
          className={cn(iconBtnCls, 'cursor-grab')}
        >
          <GripVertical aria-hidden="true" className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={onSelect}
          aria-expanded={selected}
          className="flex min-h-8 min-w-0 flex-1 items-center gap-2 rounded-lg px-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="shrink-0 text-sm font-medium text-foreground">{ROTULOS[block.type]}</span>
          {resumo(block) && (
            <span className="min-w-0 truncate text-xs text-muted-foreground">{resumo(block)}</span>
          )}
        </button>

        {/* Setas não são fallback: arrastar no toque é ruim e teclado precisa
            de alternativa. */}
        <button
          type="button"
          onClick={() => onMove(-1)}
          aria-label="Mover para cima"
          title="Mover para cima"
          className={iconBtnCls}
        >
          <ChevronUp aria-hidden="true" className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => onMove(1)}
          aria-label="Mover para baixo"
          title="Mover para baixo"
          className={iconBtnCls}
        >
          <ChevronDown aria-hidden="true" className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remover bloco"
          title="Remover bloco"
          className={cn(iconBtnCls, 'hover:bg-urgent-wash hover:text-urgent-ink')}
        >
          <Trash2 aria-hidden="true" className="h-4 w-4" />
        </button>
      </div>

      {selected && <div className="border-t border-border p-3">{children}</div>}
    </div>
  );
}
