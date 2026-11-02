'use client';

import { usePageTitle } from '@/components/layout/use-page-title';
import { QuotesScreen } from '@/features/quotes/components/quotes-screen';

export default function CotacoesPage() {
  usePageTitle('Cotações');
  return <QuotesScreen />;
}
