'use client';

import { Sparkles, X, RefreshCw, Smile, Meh, Frown, AlertTriangle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
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

/** Rótulo de seção do painel — fonte da interface, nunca mono. */
const SECTION_LABEL =
  'text-[11px] font-semibold uppercase tracking-wider text-muted-foreground';

const SENTIMENT_META: Record<string, { Icon: LucideIcon; label: string; cls: string }> = {
  satisfeito: { Icon: Smile, label: 'Satisfeito', cls: 'bg-success-wash text-success-ink' },
  neutro: { Icon: Meh, label: 'Neutro', cls: 'bg-muted text-muted-foreground' },
  irritado: { Icon: Frown, label: 'Irritado', cls: 'bg-urgent-wash text-urgent-ink' },
};

function SentimentChip({ value }: { value: string }) {
  const meta = SENTIMENT_META[value];
  // Valor desconhecido: antes saía um chip vazio; agora não sai nada.
  if (!meta) return null;
  const { Icon } = meta;
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${meta.cls}`}
    >
      <Icon aria-hidden="true" className="h-3 w-3" />
      {meta.label}
    </span>
  );
}

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

  // Mesmo desenho da recomendação no Card do Cliente (funil): seção neutra,
  // chip de sentimento, resumo, objeção num bloco âmbar e respostas sugeridas.
  return (
    <section aria-busy={busy} className="rounded-xl border border-border bg-muted/40 p-3">
      <div className="mb-2 flex min-h-8 items-center justify-between gap-2">
        <h3 className={`flex items-center gap-1.5 ${SECTION_LABEL}`}>
          <Sparkles aria-hidden="true" className="h-3.5 w-3.5" /> Resumo IA
        </h3>
        {data && !data.tooShort && (
          <button
            type="button"
            onClick={() => {
              const k = ['ai-summary', conversation.id, conversation.lastMessageAt];
              refresh.mutate(undefined, {
                onSuccess: (fresh) => queryClient.setQueryData(k, fresh),
                onError: () => toast.error('Não foi possível atualizar o resumo.'),
              });
            }}
            disabled={busy}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            aria-label="Atualizar resumo"
            title="Atualizar resumo"
          >
            <RefreshCw aria-hidden="true" className={`h-3.5 w-3.5 ${busy ? 'animate-spin' : ''}`} />
          </button>
        )}
      </div>

      {busy && (
        <p role="status" className="text-sm text-muted-foreground">
          A IA está analisando a conversa…
        </p>
      )}

      {!busy && query.isError && (
        <div className="text-sm text-urgent-ink">
          <p>Não foi possível gerar o resumo agora.</p>
          <button
            type="button"
            onClick={() => query.refetch()}
            className="mt-1 rounded text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Tentar de novo
          </button>
        </div>
      )}

      {!busy && data?.tooShort && (
        <p className="text-sm text-muted-foreground">
          Conversa curta demais para resumir ainda.
        </p>
      )}

      {!busy && data && !data.tooShort && data.summary && (
        <div className="space-y-2.5">
          {data.sentiment && SENTIMENT_META[data.sentiment] && (
            <div className="flex items-center gap-2">
              <SentimentChip value={data.sentiment} />
            </div>
          )}
          {(() => {
            const { body, suggestion } = splitSummary(data.summary);
            return (
              <>
                <p className="text-sm leading-relaxed text-foreground">{body}</p>
                {suggestion && (
                  <div>
                    <p className="text-[11px] font-medium text-muted-foreground">Sugestão</p>
                    <p className="mt-0.5 text-sm leading-relaxed text-foreground">{suggestion}</p>
                  </div>
                )}
              </>
            );
          })()}
          {data.objection && data.replies.length > 0 && (
            <>
              <p className="flex items-start gap-1.5 rounded-lg bg-warning-wash p-2 text-xs text-warning-ink">
                <AlertTriangle aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>
                  <span className="font-semibold">Objeção: </span>
                  {data.objection}
                </span>
              </p>
              <div className="space-y-1">
                <p className="text-[11px] font-medium text-muted-foreground">
                  Respostas sugeridas — clique para usar no campo de mensagem
                </p>
                <div className="flex flex-col gap-1.5">
                  {data.replies.map((reply, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => onUseReply?.(reply)}
                      className="rounded-lg border border-border bg-card px-2.5 py-1.5 text-left text-xs leading-snug text-foreground transition-colors hover:border-primary/50 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {reply}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
          {data.generatedAt && (
            <p className="text-[11px] text-muted-foreground">
              Gerado {timeAgo(data.generatedAt)}
            </p>
          )}
        </div>
      )}

      {!busy && !query.isError && data && !data.tooShort && !data.summary && (
        <p className="text-sm text-muted-foreground">
          Não há resumo disponível para esta conversa.
        </p>
      )}
    </section>
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
    <aside aria-label="Painel Inteligente" className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-card p-4 pb-[max(1rem,env(safe-area-inset-bottom))] lg:static lg:inset-auto lg:z-auto lg:w-[320px] lg:shrink-0 lg:border-r lg:border-border lg:pb-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Sparkles aria-hidden="true" className="h-4 w-4 text-primary" /> Painel Inteligente
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar painel inteligente"
          title="Fechar"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X aria-hidden="true" className="h-4 w-4" />
        </button>
      </div>

      <div className="mb-3 flex items-center gap-2">
        <span className={SECTION_LABEL}>Etapa</span>
        {isLoading ? (
          <span className="text-xs text-muted-foreground">…</span>
        ) : deal ? (
          <Badge variant="brand">{deal.stage.name}</Badge>
        ) : (
          <span className="text-xs text-muted-foreground">Fora do funil</span>
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
