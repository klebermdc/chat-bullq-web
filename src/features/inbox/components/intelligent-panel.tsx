'use client';

import { Sparkles, X, RefreshCw } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { pipelinesService, type ConversationCard } from '@/features/pipelines/services/pipelines.service';
import { ReengageSuggestionCard } from '@/features/scheduling/components/reengage-suggestion-card';
import { ConversationSchedulesSection } from '@/features/scheduling/components/conversation-schedules-section';
import { inboxService, type Conversation, type AiSummary } from '@/features/inbox/services/inbox.service';
import { CallInsightBlock } from '@/features/inbox/components/call-insight-block';

interface IntelligentPanelProps {
  conversation: Conversation;
  onClose: () => void;
  /** Chamado ao clicar numa resposta sugerida de quebra de objeção — insere
   *  o texto no composer do chat (não envia automaticamente). */
  onUseReply?: (text: string) => void;
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

/**
 * Separa o corpo do resumo da sugestão final. O prompt termina o resumo com
 * "Sugestão para o atendente: ...", então quebramos nesse marcador para
 * renderizar a sugestão em um bloco próprio. Sem o marcador (resumos antigos),
 * devolve o texto inteiro como corpo.
 */
function splitSummary(text: string): { body: string; suggestion: string | null } {
  const idx = text.search(/sugest[ãa]o para o atendente\s*:/i);
  if (idx === -1) return { body: text.trim(), suggestion: null };
  const body = text.slice(0, idx).trim();
  const suggestion = text
    .slice(idx)
    .replace(/^sugest[ãa]o para o atendente\s*:\s*/i, '')
    .trim();
  return { body, suggestion: suggestion || null };
}

/**
 * Resumo IA da conversa: gera sob demanda ao abrir o painel, com cache (a
 * queryKey inclui lastMessageAt, então nova mensagem dispara refetch). Usa a
 * chave AGENT_LLM da org via GET /conversations/:id/ai-summary.
 */
function SummaryCard({
  conversation,
  onUseReply,
}: {
  conversation: Conversation;
  onUseReply?: (text: string) => void;
}) {
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
          <span className="flex items-center gap-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.09em] text-primary">
            <Sparkles className="h-3.5 w-3.5" /> Resumo IA
          </span>
          {data && !data.tooShort && (
            <button
              onClick={() => {
                const k = ['ai-summary', conversation.id, conversation.lastMessageAt];
                refresh.mutate(undefined, {
                  onSuccess: (fresh) => queryClient.setQueryData(k, fresh),
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
            {(() => {
              const { body, suggestion } = splitSummary(data.summary);
              return (
                <>
                  <p className="mt-2 text-sm text-foreground">{body}</p>
                  {suggestion && (
                    <div className="mt-3">
                      <p className="text-sm font-bold text-foreground">Sugestão</p>
                      <p className="mt-0.5 text-sm text-muted-foreground">{suggestion}</p>
                    </div>
                  )}
                </>
              );
            })()}
            {data.objection && data.replies.length > 0 && (
              <div className="mt-3 rounded-md border border-amber-300/50 bg-amber-50/60 p-2.5 dark:border-amber-500/30 dark:bg-amber-500/10">
                <p className="flex items-center gap-1 font-mono text-[10px] font-medium uppercase tracking-[0.09em] text-amber-700 dark:text-amber-400">
                  🎯 Objeção: <span className="normal-case">{data.objection}</span>
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">Clique para usar no campo de digitação:</p>
                <div className="mt-2 flex flex-col gap-1.5">
                  {data.replies.map((reply, i) => (
                    <button
                      key={i}
                      onClick={() => onUseReply?.(reply)}
                      className="rounded-md border border-border bg-card px-2.5 py-1.5 text-left text-xs leading-snug text-foreground hover:border-primary/50 hover:bg-primary/5"
                    >
                      {reply}
                    </button>
                  ))}
                </div>
              </div>
            )}
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
 * Painel Inteligente: Resumo IA da conversa + dados do cliente + Negócio (cards
 * de pipeline vinculados à conversa, dado REAL via /pipelines/cards/by-conversation/:id).
 */
export function IntelligentPanel({ conversation, onClose, onUseReply }: IntelligentPanelProps) {
  const { data: cards, isLoading } = useQuery({
    queryKey: ['conversation-cards', conversation.id],
    queryFn: () => pipelinesService.listByConversation(conversation.id),
  });

  // Prioriza um card ganho; senão o primeiro vinculado.
  const deal: ConversationCard | undefined =
    cards?.find((c) => c.status === 'WON') ?? cards?.[0];

  return (
    <aside className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-card p-4 pb-[max(1rem,env(safe-area-inset-bottom))] lg:static lg:inset-auto lg:z-auto lg:w-[320px] lg:shrink-0 lg:border-r lg:border-border lg:pb-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="flex items-center gap-2 font-mono text-[10px] font-medium uppercase tracking-[0.09em] text-primary">
          <Sparkles className="h-4 w-4" /> Painel Inteligente
        </span>
        <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-muted">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mb-3 flex items-center gap-2">
        <span className="font-mono text-[10px] font-medium uppercase tracking-[0.09em] text-muted-foreground">
          Etapa
        </span>
        {isLoading ? (
          <span className="text-xs text-muted-foreground">…</span>
        ) : deal ? (
          <Badge variant="brand">{deal.stage.name}</Badge>
        ) : (
          <span className="text-xs text-muted-foreground">fora do funil</span>
        )}
      </div>

      <SummaryCard conversation={conversation} onUseReply={onUseReply} />

      <div className="mt-3">
        <CallInsightBlock conversationId={conversation.id} />
      </div>

      <ReengageSuggestionCard conversationId={conversation.id} />

      <ConversationSchedulesSection conversationId={conversation.id} />
    </aside>
  );
}
