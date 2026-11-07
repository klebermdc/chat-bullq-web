'use client';

import type { ReactNode } from 'react';
import { Check } from 'lucide-react';
import { controlCls } from '@/components/ui/control';
import { cn } from '@/lib/utils';
import type { InboxFilterState } from '../../lib/inbox-filters';

/** Atualiza só alguns campos do filtro (quem recebe monta o estado novo). */
export type FilterPatch = (patch: Partial<InboxFilterState>) => void;

export const labelCls =
  'block px-1 pb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground';
/** Campo do painel na escala nova: 40px de altura, 14px, canto de 12px. */
export const filterControlCls = cn(controlCls, 'h-10 rounded-xl text-sm');
export const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
export const sectionCls = 'px-1.5 py-1.5';
// Sem rolagem própria: dentro do modal só o corpo rola (rolagem dentro de
// rolagem era o que deixava o filtro ruim de mexer).
export const optionListCls = 'rounded-xl';

export function FilterSection({
  id,
  title,
  bordered,
  action,
  children,
}: {
  id: string;
  title: string;
  bordered?: boolean;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div role="group" aria-labelledby={id} className={cn(sectionCls, bordered && 'border-t border-border')}>
      <div className="flex items-center justify-between">
        <p id={id} className={labelCls}>
          {title}
        </p>
        {action}
      </div>
      {children}
    </div>
  );
}

function CheckBox({ active }: { active: boolean }) {
  return (
    <div
      aria-hidden="true"
      className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-md border transition-colors ${
        active ? 'border-primary bg-primary text-primary-foreground' : 'border-input'
      }`}
    >
      {active && <Check className="h-3 w-3" />}
    </div>
  );
}

const rowCls = `flex min-h-10 w-full items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`;

function rowTone(active: boolean): string {
  return active ? 'bg-primary/10 font-semibold text-primary' : 'text-foreground hover:bg-muted';
}

/** Linha com caixa de marcar (multi-seleção). */
export function CheckRow({
  active,
  onClick,
  label,
  disabled,
  dotColor,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  disabled?: boolean;
  dotColor?: string | null;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={active}
      disabled={disabled}
      onClick={onClick}
      className={cn(rowCls, rowTone(active))}
    >
      <CheckBox active={active} />
      {dotColor && (
        <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: dotColor }} />
      )}
      <span className="flex-1 truncate">{label}</span>
    </button>
  );
}

export function ToggleRow({
  active,
  onClick,
  icon: Icon,
  label,
  description,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ElementType;
  label: string;
  description?: string;
}) {
  return (
    <button type="button" role="checkbox" aria-checked={active} onClick={onClick} className={cn(rowCls, rowTone(active))}>
      <CheckBox active={active} />
      <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />
      <span className="flex-1 leading-tight">
        <span className="block">{label}</span>
        {description && (
          <span className="block text-xs font-normal text-muted-foreground">{description}</span>
        )}
      </span>
    </button>
  );
}

export interface PillOption<T> {
  value: T;
  label: string;
}

/** Fileira de pílulas. `isActive` decide se é escolha única ou múltipla. */
export function PillGroup<T extends string | number>({
  labelledBy,
  options,
  isActive,
  onSelect,
}: {
  labelledBy: string;
  options: readonly PillOption<T>[];
  isActive: (value: T) => boolean;
  onSelect: (value: T) => void;
}) {
  return (
    <div role="group" aria-labelledby={labelledBy} className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const active = isActive(o.value);
        return (
          <button
            key={String(o.value)}
            type="button"
            aria-pressed={active}
            onClick={() => onSelect(o.value)}
            className={`flex h-8 items-center rounded-full px-3 text-xs font-semibold transition-colors ${focusRing} ${
              active
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-foreground hover:bg-primary/10 hover:text-primary'
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function ClearButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`mb-1.5 flex h-7 items-center rounded-lg px-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-primary ${focusRing}`}
    >
      Limpar
    </button>
  );
}
