'use client';

import { useQuery } from '@tanstack/react-query';
import { Sparkles, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { pipelinesService, type ConversationCard } from '@/features/pipelines/services/pipelines.service';
import type { Conversation } from '@/features/inbox/services/inbox.service';

interface IntelligentPanelProps {
  conversation: Conversation;
  onClose: () => void;
}

/**
 * Painel Inteligente: resumo do cliente/conversa ao lado do chat.
 *
 * Resumo IA ainda é placeholder (endpoint de summarização não existe — Fase 2).
 * A seção "Negócio" já usa dado REAL: puxa os cards de pipeline vinculados à
 * conversa (`/pipelines/cards/by-conversation/:id`) e mostra a etapa atual e
 * se o negócio foi ganho (status WON → "Fechado").
 */
export function IntelligentPanel({ conversation, onClose }: IntelligentPanelProps) {
  const name = conversation.contact.name ?? 'Contato';

  const { data: cards, isLoading } = useQuery({
    queryKey: ['conversation-cards', conversation.id],
    queryFn: () => pipelinesService.listByConversation(conversation.id),
  });

  // Prioriza um card ganho; senão o primeiro vinculado.
  const deal: ConversationCard | undefined =
    cards?.find((c) => c.status === 'WON') ?? cards?.[0];

  return (
    <aside className="hidden w-[320px] shrink-0 flex-col overflow-y-auto border-l border-border bg-card p-4 lg:flex">
      <div className="mb-3 flex items-center justify-between">
        <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-primary">
          <Sparkles className="h-4 w-4" /> Painel Inteligente
        </span>
        <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-muted">
          <X className="h-4 w-4" />
        </button>
      </div>

      <Card className="border-primary/30 bg-gradient-to-b from-primary/[0.07] to-transparent">
        <CardContent className="pt-4">
          <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-primary">
            <Sparkles className="h-3.5 w-3.5" /> Resumo IA
          </span>
          <p className="mt-2 text-sm text-muted-foreground">
            Resumo automático da conversa aparecerá aqui.
          </p>
        </CardContent>
      </Card>

      <div className="mt-4">
        <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
          Cliente
        </p>
        <div className="flex items-center justify-between border-b border-border/60 py-2 text-sm">
          <span className="text-muted-foreground">Nome</span>
          <span className="font-semibold">{name}</span>
        </div>
        {conversation.contact.phone && (
          <div className="flex items-center justify-between border-b border-border/60 py-2 text-sm">
            <span className="text-muted-foreground">Telefone</span>
            <span className="font-semibold">{conversation.contact.phone}</span>
          </div>
        )}
        <div className="flex items-center justify-between border-b border-border/60 py-2 text-sm">
          <span className="text-muted-foreground">Canal</span>
          <Badge variant="brand">{conversation.channel.type}</Badge>
        </div>
      </div>

      <div className="mt-5">
        <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
          Negócio
        </p>
        {isLoading ? (
          <div className="space-y-2 py-1">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ) : deal ? (
          <>
            <div className="flex items-center justify-between border-b border-border/60 py-2 text-sm">
              <span className="text-muted-foreground">Status</span>
              {deal.status === 'WON' ? (
                <Badge variant="success">✓ Fechado</Badge>
              ) : deal.status === 'LOST' ? (
                <Badge variant="neutral">Perdido</Badge>
              ) : (
                <Badge variant="brand">{deal.stage.name}</Badge>
              )}
            </div>
            <div className="flex items-center justify-between border-b border-border/60 py-2 text-sm">
              <span className="text-muted-foreground">Pipeline</span>
              <span className="font-semibold">{deal.pipeline.name}</span>
            </div>
            <div className="flex items-center justify-between border-b border-border/60 py-2 text-sm">
              <span className="text-muted-foreground">Etapa</span>
              <span className="font-semibold">{deal.stage.name}</span>
            </div>
          </>
        ) : (
          <p className="py-1 text-sm text-muted-foreground">
            Nenhum negócio vinculado.
          </p>
        )}
      </div>
    </aside>
  );
}
