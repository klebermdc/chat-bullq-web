'use client';

import { Sparkles, X, RefreshCw } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { inboxService, type Conversation, type AiSummary } from '@/features/inbox/services/inbox.service';

interface IntelligentPanelProps {
  conversation: Conversation;
  onClose: () => void;
}

const SENTIMENT_META: Record<string, { emoji: string; label: string; cls: string }> = {
  satisfeito: { emoji: '😊', label: 'Satisfeito', cls: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
  neutro: { emoji: '😐', label: 'Neutro', cls: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300' },
  irritado: { emoji: '😠', label: 'Irritado', cls: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
};

function timeAgo(iso: string | null): string {
  if (!iso) return '';
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'agora';
  if (mins < 60) return `há ${mins} min`;
  const h = Math.round(mins / 60);
  return `há ${h} h`;
}

function SummaryCard({ conversation }: { conversation: Conversation }) {
  const queryClient = useQueryClient();
  const key = ['ai-summary', conversation.id, conversation.lastMessageAt];

  const query = useQuery<AiSummary>({
    queryKey: key,
    queryFn: () => inboxService.getAiSummary(conversation.id),
    staleTime: Infinity,
    retry: false,
  });

  const refresh = useMutation({
    mutationFn: () => inboxService.getAiSummary(conversation.id, true),
  });

  const busy = query.isLoading || query.isFetching || refresh.isPending;
  const data = query.data;

  return (
    <Card className="border-primary/30 bg-gradient-to-b from-primary/[0.07] to-transparent">
      <CardContent className="pt-4">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-primary">
            <Sparkles className="h-3.5 w-3.5" /> Resumo IA
          </span>
          {data && !data.tooShort && (
            <button
              onClick={() => {
                const k = ['ai-summary', conversation.id, conversation.lastMessageAt];
                refresh.mutate(undefined, {
                  onSuccess: (data) => queryClient.setQueryData(k, data),
                  onError: () => toast.error('Não foi possível atualizar o resumo.'),
                });
              }}
              disabled={busy}
              className="rounded p-1 text-muted-foreground hover:bg-muted disabled:opacity-50"
              title="Atualizar resumo"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${busy ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>

        {busy && (
          <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
            <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Gerando resumo…
          </p>
        )}

        {!busy && query.isError && (
          <div className="mt-2 text-sm text-muted-foreground">
            <p>Não foi possível gerar o resumo agora.</p>
            <button
              onClick={() => query.refetch()}
              className="mt-1 text-xs font-medium text-primary hover:underline"
            >
              Tentar de novo
            </button>
          </div>
        )}

        {!busy && data?.tooShort && (
          <p className="mt-2 text-sm text-muted-foreground">
            Conversa curta demais para resumir ainda.
          </p>
        )}

        {!busy && data && !data.tooShort && data.summary && (
          <>
            {data.sentiment && (
              <span
                className={`mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${SENTIMENT_META[data.sentiment]?.cls ?? ''}`}
              >
                {SENTIMENT_META[data.sentiment]?.emoji} {SENTIMENT_META[data.sentiment]?.label}
              </span>
            )}
            <p className="mt-2 text-sm text-foreground">{data.summary}</p>
            {data.generatedAt && (
              <p className="mt-1 text-[11px] text-muted-foreground">
                gerado {timeAgo(data.generatedAt)}
              </p>
            )}
          </>
        )}

        {!busy && !query.isError && data && !data.tooShort && !data.summary && (
          <p className="mt-2 text-sm text-muted-foreground">
            Não há resumo disponível para esta conversa.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Painel Inteligente: resumo IA da conversa + dados do cliente ao lado do chat.
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

      <SummaryCard conversation={conversation} />

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
