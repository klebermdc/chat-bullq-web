'use client';

import { InactivityReport } from '@/features/scheduling/components/inactivity-report';

export default function InactivityPage() {
  return (
    <div className="h-full min-h-0 overflow-y-auto">
      <InactivityReport />
    </div>
  );
}
