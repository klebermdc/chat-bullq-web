'use client';

import { useState } from 'react';
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import {
  ArrowDown,
  ArrowUp,
  Bookmark,
  Check,
  ChevronDown,
  Pencil,
  RefreshCw,
  Trash2,
  User,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { cn } from '@/lib/utils';
import { DEFAULT_FILTERS, sameFilters, type InboxFilterState } from '../lib/inbox-filters';
import {
  SHORTCUT_NAME_MAX,
  findMatchingShortcut,
  moveShortcut,
  removeShortcut,
  renameShortcut,
  updateShortcutFilters,
  type FilterShortcut,
} from '../lib/filter-shortcuts';

export type ScopeFilter = 'ALL' | 'MINE';

const FOCUS_RING = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

const SCOPE_OPTIONS = [
  { label: 'Todas as conversas', value: 'ALL', icon: Users },
  { label: 'Minhas conversas', value: 'MINE', icon: User },
] as const;

const rowCls = (active: boolean) =>
  cn(
    'flex min-h-11 w-full items-center gap-2.5 rounded-xl px-3 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 md:min-h-10',
    FOCUS_RING,
    active ? 'bg-primary/10 font-semibold text-primary' : 'text-foreground hover:bg-muted',
  );

const iconBtnCls = cn(
  'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-background hover:text-foreground',
  FOCUS_RING,
);

interface ScopeMenuProps {
  scope: ScopeFilter;
  onScopeChange: (next: ScopeFilter) => void;
  canPickMine: boolean;
  /** Fora de visão salva: mostra a seção "Meus filtros". */
  showShortcuts: boolean;
  shortcuts: readonly FilterShortcut[];
  filters: InboxFilterState;
  onApplyFilters: (next: InboxFilterState) => void;
  onShortcutsChange: (next: FilterShortcut[]) => void;
}

type RowAction = 'up' | 'down' | 'rename' | 'update' | 'delete';

function RenameInput({ initial, onSubmit, onCancel }: { initial: string; onSubmit: (n: string) => void; onCancel: () => void }) {
  const [name, setName] = useState(initial);
  return (
    <input
      autoFocus
      type="text"
      value={name}
      maxLength={SHORTCUT_NAME_MAX}
      aria-label={`Novo nome do atalho ${initial}`}
      onChange={(e) => setName(e.target.value)}
      onBlur={onCancel}
      onKeyDown={(e) => {
        // Espaço e setas não podem chegar ao Popover.
        e.stopPropagation();
        if (e.key === 'Enter') onSubmit(name);
        if (e.key === 'Escape') onCancel();
      }}
      className={cn('h-10 w-full rounded-xl border border-input bg-background px-3 text-sm', FOCUS_RING)}
    />
  );
}

function ShortcutRow({
  shortcut,
  index,
  total,
  active,
  onApply,
  onAction,
}: {
  shortcut: FilterShortcut;
  index: number;
  total: number;
  active: boolean;
  onApply: () => void;
  onAction: (action: RowAction) => void;
}) {
  const actions: { key: RowAction; label: string; icon: typeof Pencil; show: boolean }[] = [
    { key: 'update', label: 'Atualizar com os filtros atuais', icon: RefreshCw, show: !active },
    { key: 'up', label: 'Subir', icon: ArrowUp, show: index > 0 },
    { key: 'down', label: 'Descer', icon: ArrowDown, show: index < total - 1 },
    { key: 'rename', label: 'Renomear', icon: Pencil, show: true },
    { key: 'delete', label: 'Excluir', icon: Trash2, show: true },
  ];
  return (
    <div className={cn('group relative flex items-center rounded-xl', active ? 'bg-primary/10' : 'hover:bg-muted')}>
      <button
        type="button"
        role="radio"
        aria-checked={active}
        onClick={onApply}
        className={cn(rowCls(active), 'min-w-0 flex-1 bg-transparent hover:bg-transparent')}
      >
        <Bookmark aria-hidden="true" className="h-4 w-4 shrink-0" />
        <span className="flex-1 truncate">{shortcut.name}</span>
        {active && <Check aria-hidden="true" className="h-4 w-4 shrink-0 text-primary" />}
      </button>
      {/* Ações: sempre visíveis no toque; no computador ficam por cima do fim
          da linha só ao passar ou focar, para o nome usar a largura toda. */}
      <div
        className={cn(
          'flex shrink-0 items-center pr-1',
          'md:pointer-events-none md:absolute md:inset-y-0 md:right-0 md:rounded-r-xl md:pl-3 md:opacity-0',
          'md:group-focus-within:pointer-events-auto md:group-focus-within:opacity-100 md:group-hover:pointer-events-auto md:group-hover:opacity-100',
          active ? 'md:bg-[color-mix(in_oklab,var(--color-popover),var(--color-primary)_10%)]' : 'md:bg-muted',
        )}
      >
        {actions
          .filter((a) => a.show)
          .map((a) => (
            <button
              key={a.key}
              type="button"
              title={a.label}
              aria-label={`${a.label}: ${shortcut.name}`}
              onClick={() => onAction(a.key)}
              className={cn(iconBtnCls, a.key === 'delete' && 'hover:text-urgent-ink')}
            >
              <a.icon aria-hidden="true" className="h-3.5 w-3.5" />
            </button>
          ))}
      </div>
    </div>
  );
}

/**
 * Seletor do topo da lista: Todas / Minhas + "Meus filtros" (atalhos salvos),
 * no estilo do menu do Umbler. O botão mostra o atalho ativo, se houver.
 */
export function ScopeMenu(props: ScopeMenuProps) {
  const { scope, onScopeChange, canPickMine, showShortcuts, shortcuts, filters, onApplyFilters, onShortcutsChange } = props;
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const { confirm, confirmDialog } = useConfirm();

  const activeShortcut = showShortcuts ? findMatchingShortcut(shortcuts, filters) : undefined;
  const currentScope = SCOPE_OPTIONS.find((o) => o.value === scope) ?? SCOPE_OPTIONS[0];
  const ButtonIcon = activeShortcut ? Bookmark : currentScope.icon;
  const buttonLabel = activeShortcut?.name ?? currentScope.label;

  const pickScope = (next: ScopeFilter) => {
    onScopeChange(next);
    // Escolher Todas/Minhas com um atalho ligado volta para a lista sem filtro.
    if (activeShortcut) onApplyFilters(DEFAULT_FILTERS);
  };

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

  const handleAction = (s: FilterShortcut, action: RowAction) => {
    if (action === 'update') {
      onShortcutsChange(updateShortcutFilters(shortcuts, s.id, filters));
      toast.success(`Atalho "${s.name}" atualizado.`);
    } else if (action === 'rename') setRenamingId(s.id);
    else if (action === 'up' || action === 'down') {
      onShortcutsChange(moveShortcut(shortcuts, s.id, action === 'up' ? -1 : 1));
    } else void remove(s);
  };

  return (
    <>
      <Popover className="relative">
        <PopoverButton
          aria-label={`Mostrando: ${buttonLabel}`}
          className={`flex h-11 w-full items-center gap-2.5 rounded-2xl bg-chat px-3.5 text-left text-[14.5px] text-foreground transition-colors hover:bg-primary/10 data-[open]:bg-primary/10 ${FOCUS_RING}`}
        >
          <ButtonIcon aria-hidden="true" className="h-5 w-5 shrink-0 text-muted-foreground" />
          <span className="flex-1 truncate font-semibold">{buttonLabel}</span>
          <ChevronDown aria-hidden="true" className="h-4 w-4 shrink-0 text-muted-foreground" />
        </PopoverButton>
        <PopoverPanel
          anchor="bottom start"
          transition
          className="z-50 max-h-[min(32rem,var(--anchor-max-height))] w-[max(var(--button-width),18rem)] overflow-y-auto rounded-2xl border border-border bg-popover p-1.5 shadow-elevated outline-none transition duration-100 ease-out scrollbar-thin data-[closed]:scale-95 data-[closed]:opacity-0 [--anchor-gap:0.375rem]"
        >
          {({ close }) => (
            <div role="radiogroup" aria-label="Quais conversas mostrar">
              {SCOPE_OPTIONS.map((option) => {
                const disabled = option.value === 'MINE' && !canPickMine;
                const active = !activeShortcut && scope === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    disabled={disabled}
                    onClick={() => {
                      pickScope(option.value);
                      close();
                    }}
                    className={rowCls(active)}
                  >
                    <option.icon aria-hidden="true" className="h-4 w-4 shrink-0" />
                    <span className="flex-1">{option.label}</span>
                    {active && <Check aria-hidden="true" className="h-4 w-4 text-primary" />}
                  </button>
                );
              })}
              {showShortcuts && shortcuts.length > 0 && (
                <>
                  <p className="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Meus filtros
                  </p>
                  {shortcuts.map((s, index) =>
                    s.id === renamingId ? (
                      <RenameInput
                        key={s.id}
                        initial={s.name}
                        onSubmit={(name) => rename(s.id, name)}
                        onCancel={() => setRenamingId(null)}
                      />
                    ) : (
                      <ShortcutRow
                        key={s.id}
                        shortcut={s}
                        index={index}
                        total={shortcuts.length}
                        active={sameFilters(s.filters, filters)}
                        onApply={() => {
                          onApplyFilters(s.filters);
                          close();
                        }}
                        onAction={(action) => handleAction(s, action)}
                      />
                    ),
                  )}
                </>
              )}
            </div>
          )}
        </PopoverPanel>
      </Popover>
      {confirmDialog}
    </>
  );
}
