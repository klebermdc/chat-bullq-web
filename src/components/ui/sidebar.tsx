"use client";

import { cn, isRouteActive } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode } from "react";

export function Sidebar({ children }: { children: ReactNode }) {
  return <nav aria-label="Menu principal" className="flex h-full flex-col">{children}</nav>;
}

export function SidebarHeader({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 border-b menu-border px-4 py-4",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function SidebarBody({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-1 flex-col gap-2 overflow-y-auto px-4 py-4">
      {children}
    </div>
  );
}

export function SidebarFooter({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 border-t menu-border px-4 py-4",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function SidebarSection({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-0.5", className)}>{children}</div>
  );
}

export function SidebarSpacer() {
  return <div aria-hidden className="mt-auto" />;
}

export function SidebarHeading({ children }: { children: ReactNode }) {
  return (
    <h3 className="menu-muted mb-1 px-2 text-xs/6 font-medium">
      {children}
    </h3>
  );
}

interface SidebarItemProps {
  href?: string;
  current?: boolean;
  onClick?: () => void;
  className?: string;
  children: ReactNode;
}

export function SidebarItem({
  href,
  current,
  onClick,
  className,
  children,
}: SidebarItemProps) {
  const pathname = usePathname();
  const isActive = current ?? (href ? isRouteActive(pathname, href) : false);

  const classes = cn(
    "flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left text-sm/6 font-medium transition-colors",
    isActive ? "menu-row-active" : "menu-row",
    className,
  );

  if (href) {
    return (
      <Link href={href} className={classes} aria-current={isActive ? 'page' : undefined}>
        {children}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={classes}>
      {children}
    </button>
  );
}

export function SidebarLabel({ children }: { children: ReactNode }) {
  return <span className="truncate">{children}</span>;
}
