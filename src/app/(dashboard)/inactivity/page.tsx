'use client';

import { InactivityReport } from '@/features/scheduling/components/inactivity-report';
import { usePageTitle } from '@/components/layout/use-page-title';

export default function InactivityPage() {
  usePageTitle('Inatividade de clientes');
  return (
    <div className="h-full min-h-0 overflow-y-auto">
      <InactivityReport />
    </div>
  );
}
