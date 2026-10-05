'use client';

import { type ReactNode } from 'react';
import {
  Menu,
  MenuButton,
  MenuItem,
  MenuItems,
} from '@headlessui/react';
import { cn } from '@/lib/utils';

export function Dropdown({ children }: { children: ReactNode }) {
  return <Menu>{children}</Menu>;
}

export const DropdownButton = MenuButton;

interface DropdownMenuProps {
  className?: string;
  anchor?: 'bottom start' | 'bottom end' | 'top start' | 'top end';
  children: ReactNode;
}

export function DropdownMenu({
  className,
  anchor = 'bottom start',
  children,
}: DropdownMenuProps) {
  return (
    <MenuItems
      anchor={anchor}
      transition
      className={cn(
        'z-50 min-w-[var(--button-width)] rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-elevated focus:outline-none',
        'transition duration-100 ease-out data-[closed]:scale-95 data-[closed]:opacity-0',
        '[--anchor-gap:0.25rem]',
        className,
      )}
    >
      {children}
    </MenuItems>
  );
}

interface DropdownItemProps {
  href?: string;
  onClick?: () => void;
  className?: string;
  children: ReactNode;
}

export function DropdownItem({
  href,
  onClick,
  className,
  children,
}: DropdownItemProps) {
  const classes = cn(
    'group flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm text-foreground',
    'data-[focus]:bg-primary/10 data-[focus]:text-foreground data-[focus]:outline-none',
    '[&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-muted-foreground',
    className,
  );

  return href ? (
    <MenuItem as="a" href={href} className={classes}>
      {children}
    </MenuItem>
  ) : (
    <MenuItem as="button" type="button" onClick={onClick} className={classes}>
      {children}
    </MenuItem>
  );
}

export function DropdownLabel({ children }: { children: ReactNode }) {
  return <span className="truncate">{children}</span>;
}

export function DropdownDivider() {
  return <div className="my-1 h-px bg-border" />;
}
