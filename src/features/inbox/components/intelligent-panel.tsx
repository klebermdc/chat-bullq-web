'use client';

import { Sparkles, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Conversation } from '@/features/inbox/services/inbox.service';

interface IntelligentPanelProps {
  conversation: Conversation;
  onClose: () => void;
}

/**
 * Painel Inteligente: resumo do cliente/conversa ao lado do chat.
 * Por enquanto é só estrutura + estado vazio — o resumo automático (IA)
 * ainda não existe no backend, então mostramos um placeholder até a
 * Fase 2 plugar o endpoint real.
 */
export function IntelligentPanel({ conversation, onClose }: IntelligentPanelProps) {
  const name = conversation.contact.name ?? 'Contato';

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
    </aside>
  );
}
