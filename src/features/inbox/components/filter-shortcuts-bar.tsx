'use client';

import { useState } from 'react';
import { ArrowLeft, ArrowRight, MoreHorizontal, Pencil, RefreshCw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Dropdown, DropdownButton, DropdownDivider, DropdownItem, DropdownLabel, DropdownMenu } from '@/components/ui/dropdown';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { cn } from '@/lib/utils';
import { sameFilters, type InboxFilterState } from '../lib/inbox-filters';
import {
  SHORTCUT_NAME_MAX,
  moveShortcut,
  removeShortcut,
  renameShortcut,
  updateShortcutFilters,
  type FilterShortcut,
} from '../lib/filter-shortcuts';

const FOCUS_RING = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

interface FilterShortcutsBarProps {
  shortcuts: readonly FilterShortcut[];
  current: InboxFilterState;
  /** Troca o filtro inteiro pelo do atalho. */
  onApply: (filters: InboxFilterState) => void;
  /** Lista nova de atalhos (quem chama salva nas preferências). */
  onShortcutsChange: (next: FilterShortcut[]) => void;
}

function RenameInput({
  shortcut,
  onSubmit,
  onCancel,
}: {
  shortcut: FilterShortcut;
  onSubmit: (name: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(shortcut.name);
  return (
    <input
      autoFocus
      type="text"
      value={name}
      maxLength={SHORTCUT_NAME_MAX}
      aria-label={`Novo nome do atalho ${shortcut.name}`}
      onChange={(e) => setName(e.target.value)}
      onBlur={onCancel}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onSubmit(name);
        if (e.key === 'Escape') onCancel();
      }}
      className={`h-8 w-40 shrink-0 rounded-full border border-input bg-background px-3 text-xs font-semibold text-foreground ${FOCUS_RING}`}
    />
  );
}

function ShortcutMenu({
  shortcut,
  index,
  total,
  canUpdate,
  onAction,
}: {
  shortcut: FilterShortcut;
  index: number;
  total: number;
  canUpdate: boolean;
  onAction: (action: 'update' | 'rename' | 'left' | 'right' | 'delete') => void;
}) {
  return (
    <Dropdown>
      <DropdownButton
        aria-label={`Opções do atalho ${shortcut.name}`}
        title="Opções do atalho"
        className={`flex h-8 w-7 items-center justify-center rounded-r-full transition-colors hover:bg-primary/20 ${FOCUS_RING}`}
      >
        <MoreHorizontal aria-hidden="true" className="h-4 w-4" />
      </DropdownButton>
      <DropdownMenu anchor="bottom end" className="min-w-56">
        {canUpdate && (
          <DropdownItem onClick={() => onAction('update')}>
            <RefreshCw /> <DropdownLabel>Atualizar com os filtros atuais</DropdownLabel>
          </DropdownItem>
        )}
        <DropdownItem onClick={() => onAction('rename')}>
          <Pencil /> <DropdownLabel>Renomear</DropdownLabel>
        </DropdownItem>
        {index > 0 && (
          <DropdownItem onClick={() => onAction('left')}>
            <ArrowLeft /> <DropdownLabel>Mover para a esquerda</DropdownLabel>
          </DropdownItem>
        )}
        {index < total - 1 && (
          <DropdownItem onClick={() => onAction('right')}>
            <ArrowRight /> <DropdownLabel>Mover para a direita</DropdownLabel>
          </DropdownItem>
        )}
        <DropdownDivider />
        <DropdownItem onClick={() => onAction('delete')} className="text-urgent-ink">
          <Trash2 /> <DropdownLabel>Excluir</DropdownLabel>
        </DropdownItem>
      </DropdownMenu>
    </Dropdown>
  );
}

/** Fileira de atalhos de filtro: um clique aplica o filtro salvo. */
export function FilterShortcutsBar({ shortcuts, current, onApply, onShortcutsChange }: FilterShortcutsBarProps) {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const { confirm, confirmDialog } = useConfirm();
  if (shortcuts.length === 0) return null;

  const rename = (id: string, name: string) => {
    const result = renameShortcut(shortcuts, id, name);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    onShortcutsChange(result.shortcuts);
    setRenamingId(null);
  };

  const remove = async (s: FilterShortcut) => {
    const ok = await confirm({
      title: `Excluir o atalho "${s.name}"?`,
      description: 'Só o atalho some — os filtros que estão aplicados agora continuam.',
      confirmLabel: 'Excluir',
      destructive: true,
    });
    if (ok) onShortcutsChange(removeShortcut(shortcuts, s.id));
  };

  const handleAction = (s: FilterShortcut, action: 'update' | 'rename' | 'left' | 'right' | 'delete') => {
    if (action === 'update') {
      onShortcutsChange(updateShortcutFilters(shortcuts, s.id, current));
      toast.success(`Atalho "${s.name}" atualizado.`);
    } else if (action === 'rename') setRenamingId(s.id);
    else if (action === 'left' || action === 'right') {
      onShortcutsChange(moveShortcut(shortcuts, s.id, action === 'left' ? -1 : 1));
    } else void remove(s);
  };

  return (
    <div
      role="group"
      aria-label="Atalhos de filtro"
      className="flex items-center gap-1.5 overflow-x-auto px-3.5 pt-2.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {shortcuts.map((s, index) => {
        if (s.id === renamingId) {
          return <RenameInput key={s.id} shortcut={s} onSubmit={(name) => rename(s.id, name)} onCancel={() => setRenamingId(null)} />;
        }
        const active = sameFilters(s.filters, current);
        return (
          <span
            key={s.id}
            className={cn(
              'inline-flex h-8 shrink-0 items-center rounded-full text-xs font-semibold transition-colors',
              active ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground',
            )}
          >
            <button
              type="button"
              aria-pressed={active}
              onClick={() => onApply(s.filters)}
              title={`Aplicar o atalho ${s.name}`}
              className={cn('flex h-8 max-w-48 items-center truncate rounded-l-full pl-3 pr-1.5', !active && 'hover:text-primary', FOCUS_RING)}
            >
              <span className="truncate">{s.name}</span>
            </button>
            <ShortcutMenu
              shortcut={s}
              index={index}
              total={shortcuts.length}
              canUpdate={!active}
              onAction={(action) => handleAction(s, action)}
            />
          </span>
        );
      })}
      {confirmDialog}
    </div>
  );
}
