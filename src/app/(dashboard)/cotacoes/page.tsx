'use client';

import { usePageTitle } from '@/components/layout/use-page-title';
import { QuotesScreen } from '@/features/quotes/components/quotes-screen';

export default function CotacoesPage() {
  usePageTitle('Cotações');
  return (
    <div className="h-full min-h-0 overflow-y-auto">
      <QuotesScreen />
    </div>
  );
}
