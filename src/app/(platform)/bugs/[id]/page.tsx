'use client';

import { use } from 'react';
import { BugsScreen } from '@/features/bugs/components/bugs-screen';

export default function BugDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <BugsScreen initialSelectedId={id} />;
}
