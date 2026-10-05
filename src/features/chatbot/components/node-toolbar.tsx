'use client';

import { ADDABLE_NODE_TYPES, NODE_TYPE_META } from './node-types';

interface NodeToolbarProps {
  onAddNode: (type: string) => void;
}

export function NodeToolbar({ onAddNode }: NodeToolbarProps) {
  return (
    <div className="absolute left-4 top-4 z-10 flex flex-col gap-1 rounded-xl border border-border bg-card/95 p-2 shadow-elevated backdrop-blur-sm">
      <p className="px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Adicionar nó</p>
      {ADDABLE_NODE_TYPES.map((type) => {
        const { label, icon: Icon, color } = NODE_TYPE_META[type];
        return (
          <button
            key={type}
            type="button"
            onClick={() => onAddNode(type)}
            className="flex min-h-8 items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-white ${color}`}>
              <Icon aria-hidden="true" className="h-3.5 w-3.5" />
            </span>
            {label}
          </button>
        );
      })}
    </div>
  );
}
