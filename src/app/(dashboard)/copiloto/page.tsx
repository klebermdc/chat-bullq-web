'use client';

import { CopilotChat } from '@/features/copilot/components/copilot-chat';
import { usePageTitle } from '@/components/layout/use-page-title';

export default function CopilotoPage() {
  usePageTitle('Copiloto');
  return (
    <div className="h-full min-h-0">
      <CopilotChat />
    </div>
  );
}
