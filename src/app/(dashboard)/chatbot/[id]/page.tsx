'use client';

import { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import { LoadingState } from '@/components/ui/empty-state';
import { FlowEditor } from '@/features/chatbot/components/flow-editor';
import { chatbotService } from '@/features/chatbot/services/chatbot.service';
import { usePageTitle } from '@/components/layout/use-page-title';

export default function ChatbotEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const { data: flow, isLoading, error } = useQuery({
    queryKey: ['chatbot-flow', id],
    queryFn: () => chatbotService.getById(id),
  });
  usePageTitle(flow?.name ? `Chatbot · ${flow.name}` : 'Chatbot');

  if (isLoading) {
    return (
      <LoadingState label="Carregando fluxo…" className="h-screen" />
    );
  }

  if (error || !flow) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-sm text-urgent-ink">Não foi possível carregar o fluxo.</p>
      </div>
    );
  }

  return <FlowEditor flow={flow} />;
}
