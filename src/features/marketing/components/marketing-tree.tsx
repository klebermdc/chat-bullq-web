'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { TrendingUp, FileBarChart } from 'lucide-react';
import { usePermissions } from '@/lib/permissions';
import { cn, isRouteActive } from '@/lib/utils';

/**
 * Marketing na sidebar, com "Relatórios" como sub-linha.
 *
 * Sem seta de recolher: o filho fica sempre visível. Difere de
 * PipelinesTree/JarvisTree de propósito — ali a lista é longa e recolher
 * paga o próprio custo; aqui é um item só.
 *
 * As duas permissões são checadas separadamente: quem tem crm-reports.view
 * mas não marketing.view continua enxergando "Relatórios", só que sem a
 * linha-mãe em cima.
 */
export function MarketingTree() {
  const pathname = usePathname();
  const { can } = usePermissions();

  const canMarketing = can('marketing.view');
  const canReports = can('crm-reports.view');
  if (!canMarketing && !canReports) return null;

  return (
    <div className="space-y-0.5">
      {canMarketing && (
        <Link
          href="/marketing"
          className={cn(
            'flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm font-medium',
            isRouteActive(pathname, '/marketing') ? 'menu-row-active' : 'menu-row',
          )}
        >
          <TrendingUp className="size-5" />
          <span className="flex-1">Marketing</span>
        </Link>
      )}

      {canReports && (
        <div className="menu-border ml-5 space-y-0.5 border-l pl-2">
          <Link
            href="/relatorios"
            className={cn(
              'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs',
              isRouteActive(pathname, '/relatorios')
                ? 'menu-subrow-active font-medium'
                : 'menu-subrow',
            )}
          >
            <FileBarChart className="menu-muted size-3.5" />
            <span className="flex-1">Relatórios</span>
          </Link>
        </div>
      )}
    </div>
  );
}
