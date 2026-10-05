'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  MessageSquare,
  Pencil,
  User,
  Sparkles,
  RefreshCw,
  CalendarDays,
  Users,
  Ticket,
  ExternalLink,
  AlertTriangle,
} from 'lucide-react';
import {
  pipelinesService,
  type CardSummary,
  type PipelineStage,
} from '../services/pipelines.service';
import { CallInsightBlock } from '@/features/inbox/components/call-insight-block';
import { resolveLeadOrigin } from '../lib/lead-origin';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/errors';
import { toLocalDate } from '@/lib/date-only';
import { formatMoney } from '@/lib/money';
import { getInitials } from '@/lib/initials';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { controlCls } from '@/components/ui/control';

interface Props {
  open: boolean;
  card: CardSummary | null;
  /** Etapas do quadro, na ordem das colunas. */
  stages: PipelineStage[];
  /** Move o card de etapa — o mesmo caminho do arrastar e soltar. */
  onMoveStage: (stageId: string) => Promise<void>;
  onClose: () => void;
  onOpenConversation: (conversationId: string) => void;
  onEdit: (card: CardSummary) => void;
}

const formatDate = (iso: string | null | undefined) => {
  const d = toLocalDate(iso);
  if (!d) return null;
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(d);
};

/** "há X dias/horas" simples, sem dependência externa. */
const relativeFrom = (iso: string | null | undefined) => {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;
  const diffMs = Date.now() - then;
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return 'agora mesmo';
  if (mins < 60) return `há ${mins} min`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `há ${hrs}h`;
  const days = Math.round(hrs / 24);
  if (days === 1) return 'ontem';
  if (days < 30) return `há ${days} dias`;
  const months = Math.round(days / 30);
  return `há ${months} ${months === 1 ? 'mês' : 'meses'}`;
};

const SENTIMENT_STYLE: Record<string, string> = {
  satisfeito: 'bg-success-wash text-success-ink',
  neutro: 'bg-muted text-muted-foreground',
  irritado: 'bg-urgent-wash text-urgent-ink',
};

const CHIP_CLS =
  'inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-medium';
const HINT_CLS = 'text-sm text-muted-foreground';
const LABEL_CLS = 'mb-1 block text-sm font-medium text-foreground';

/** Etapas de fechamento dizem no próprio nome o que acontece ao mover. */
export function stageOptionLabel(stage: PipelineStage) {
  if (stage.type === 'WON') return `${stage.name} (ganho)`;
  if (stage.type === 'LOST') return `${stage.name} (perdido)`;
  return stage.name;
}
const ERROR_CLS = 'text-sm text-urgent-ink';

type EditableOrigin = 'INSTAGRAM_ORGANIC' | 'WHATSAPP_DIRECT';
const EDITABLE_ORIGINS: Array<{ value: EditableOrigin; label: string }> = [
  { value: 'WHATSAPP_DIRECT', label: 'WhatsApp direto' },
  { value: 'INSTAGRAM_ORGANIC', label: 'Instagram Orgânico' },
];

function temperatureChip(temperature: number) {
  if (temperature >= 3) return { label: 'Quente', cls: 'bg-urgent-wash text-urgent-ink' };
  if (temperature === 2) return { label: 'Morno', cls: 'bg-warning-wash text-warning-ink' };
  return { label: 'Frio', cls: 'bg-muted text-muted-foreground' };
}

function Section({
  title,
  icon,
  action,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-muted/40 p-3">
      <div className="mb-2 flex min-h-8 items-center justify-between gap-2">
        <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {icon}
          {title}
        </h4>
        {action}
      </div>
      {children}
    </section>
  );
}

export function ClientCardDialog({
  open,
  card,
  stages,
  onMoveStage,
  onClose,
  onOpenConversation,
  onEdit,
}: Props) {
  const contactId = card?.contactId ?? null;
  const conversationId = card?.conversationId ?? null;

  const proposalQuery = useQuery({
    queryKey: ['client-card-proposal', conversationId, contactId],
    queryFn: () =>
      pipelinesService.getLatestProposal({ conversationId, contactId }),
    enabled: open && !!card && (!!conversationId || !!contactId),
  });

  const summaryQuery = useQuery({
    queryKey: ['client-card-ai-summary', conversationId],
    queryFn: () => pipelinesService.getAiSummary(conversationId!),
    enabled: open && !!conversationId,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const queryClient = useQueryClient();
  const setOriginMutation = useMutation({
    mutationFn: (origin: EditableOrigin) =>
      pipelinesService.setOrigin(conversationId!, origin),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['pipeline-board', card?.pipelineId],
      });
      toast.success('Origem atualizada');
    },
    onError: (err: any) => {
      toast.error(getErrorMessage(err, 'Erro ao atualizar a origem'));
    },
  });

  const [movingStage, setMovingStage] = useState(false);

  if (!open || !card) return null;

  // Alternativa ao arraste (teclado, leitor de tela, toque): mesma mutação.
  const handleStageChange = async (stageId: string) => {
    if (stageId === card.stageId) return;
    setMovingStage(true);
    try {
      await onMoveStage(stageId);
    } finally {
      setMovingStage(false);
    }
  };

  const contact = card.contact;
  // Atendente real = quem atende a conversa; cai pro assignee do card se não houver.
  const assignedTo = card.conversation?.assignedTo ?? card.assignedTo;
  const cardValue = formatMoney(card.value, card.currency);
  const proposal = proposalQuery.data;
  const leadOrigin = resolveLeadOrigin(card);
  // Anúncio, Site e Instagram (canal) não são corrigíveis por aqui: entram como
  // opção desabilitada só para o seletor mostrar a origem real.
  const isEditableOrigin = EDITABLE_ORIGINS.some((o) => o.value === leadOrigin.key);
  const temperature = card.conversation?.temperature
    ? temperatureChip(card.conversation.temperature)
    : null;
  const proposalSentAt = proposal ? relativeFrom(proposal.createdAt) : null;

  return (
    <Dialog
      open
      onClose={onClose}
      size="lg"
      title={
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="min-w-0 break-words">
            {contact?.name || contact?.phone || card.title}
          </span>
          {temperature && (
            <span className={`${CHIP_CLS} ${temperature.cls}`} title="Termômetro do lead">
              {temperature.label}
            </span>
          )}
          {card.status === 'WON' && (
            <span className={`${CHIP_CLS} bg-success-wash text-success-ink`}>Ganho</span>
          )}
          {card.status === 'LOST' && (
            <span className={`${CHIP_CLS} bg-urgent-wash text-urgent-ink`}>Perdido</span>
          )}
        </span>
      }
      description={
        contact?.phone || cardValue ? (
          <span className="flex flex-wrap items-center gap-x-3 gap-y-0.5 font-mono tabular-nums">
            {contact?.phone && <span>{contact.phone}</span>}
            {cardValue && <span className="font-medium text-foreground">{cardValue}</span>}
          </span>
        ) : undefined
      }
      footer={
        <>
          <Button variant="outline" onClick={() => onEdit(card)}>
            <Pencil aria-hidden="true" className="h-3.5 w-3.5" />
            Editar card
          </Button>
          {conversationId && (
            <Button onClick={() => onOpenConversation(conversationId)}>
              <MessageSquare aria-hidden="true" className="h-3.5 w-3.5" />
              Abrir conversa
            </Button>
          )}
        </>
      }
    >
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="client-card-stage" className={LABEL_CLS}>
            Etapa
          </label>
          <select
            id="client-card-stage"
            className={`${controlCls} w-full`}
            value={card.stageId}
            onChange={(e) => handleStageChange(e.target.value)}
            disabled={movingStage}
            aria-busy={movingStage}
          >
            {stages.map((s) => (
              <option key={s.id} value={s.id}>
                {stageOptionLabel(s)}
              </option>
            ))}
          </select>
        </div>

        {/* Origem: um controle só (antes aparecia como texto e de novo no seletor). */}
        <div>
          <label htmlFor="client-card-origin" className={LABEL_CLS}>
            Origem
          </label>
          {conversationId ? (
            <select
              id="client-card-origin"
              className={`${controlCls} w-full`}
              value={leadOrigin.key}
              onChange={(e) =>
                setOriginMutation.mutate(e.target.value as EditableOrigin)
              }
              disabled={setOriginMutation.isPending}
            >
              {!isEditableOrigin && (
                <option value={leadOrigin.key} disabled>
                  {leadOrigin.label}
                </option>
              )}
              {EDITABLE_ORIGINS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          ) : (
            <p id="client-card-origin" className="flex h-9 items-center text-sm text-foreground">
              {leadOrigin.label}
            </p>
          )}
        </div>
        </div>

        {/* Atendente */}
        <Section title="Atendente" icon={<User aria-hidden="true" className="h-3.5 w-3.5" />}>
          {assignedTo ? (
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                {getInitials(assignedTo.name) || '?'}
              </span>
              <span className="min-w-0 truncate text-sm text-foreground">
                {assignedTo.name}
              </span>
            </div>
          ) : (
            <p className={HINT_CLS}>Sem atendente atribuído</p>
          )}
        </Section>

        {/* Proposta enviada */}
        <Section
          title="Proposta enviada"
          icon={<Ticket aria-hidden="true" className="h-3.5 w-3.5" />}
        >
          {proposalQuery.isLoading ? (
            <p className={HINT_CLS}>Carregando proposta…</p>
          ) : proposalQuery.isError ? (
            <p className={ERROR_CLS}>Erro ao carregar a proposta.</p>
          ) : !proposal ? (
            <p className={HINT_CLS}>Nenhuma proposta enviada ainda.</p>
          ) : (
            <div className="space-y-2">
              <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
                <span className="font-mono text-xl font-semibold tabular-nums text-foreground">
                  {formatMoney(proposal.totalValue, proposal.currency) ?? '—'}
                </span>
                {proposalSentAt && (
                  <span className="text-[11px] text-muted-foreground">
                    enviada {proposalSentAt}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-foreground">
                <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                  <Users aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  {proposal.adults} adulto(s)
                  {proposal.children > 0
                    ? `, ${proposal.children} criança(s)`
                    : ''}
                </span>
                <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                  <CalendarDays aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  {formatDate(proposal.startDate) ?? '?'} –{' '}
                  {formatDate(proposal.endDate) ?? '?'}
                </span>
              </div>
              {Array.isArray(proposal.parks) && proposal.parks.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {proposal.parks.map((p, i) => {
                    const nome =
                      typeof p === 'string' ? p : (p?.nome ?? '');
                    const dias = typeof p === 'string' ? null : p?.dias;
                    if (!nome) return null;
                    return (
                      <span
                        key={`${nome}-${i}`}
                        className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"
                      >
                        {nome}
                        {dias ? ` · ${dias}d` : ''}
                      </span>
                    );
                  })}
                </div>
              )}
              {proposal.checkoutUrl && (
                <a
                  href={proposal.checkoutUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  Abrir checkout
                  <ExternalLink aria-hidden="true" className="h-3 w-3" />
                </a>
              )}
            </div>
          )}
        </Section>

        {/* Recomendação da IA */}
        <Section
          title="Recomendação da IA"
          icon={<Sparkles aria-hidden="true" className="h-3.5 w-3.5" />}
          action={
            conversationId ? (
              <button
                type="button"
                onClick={() => summaryQuery.refetch()}
                disabled={summaryQuery.isFetching}
                className="inline-flex h-8 shrink-0 items-center gap-1 rounded-lg px-2 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
                title="Gerar a recomendação de novo"
              >
                <RefreshCw
                  aria-hidden="true"
                  className={`h-3 w-3 ${summaryQuery.isFetching ? 'animate-spin' : ''}`}
                />
                Gerar de novo
              </button>
            ) : undefined
          }
        >
          {!conversationId ? (
            <p className={HINT_CLS}>
              Vincule uma conversa a este card para gerar a recomendação.
            </p>
          ) : summaryQuery.isLoading ? (
            <p className={HINT_CLS}>A IA está analisando a conversa…</p>
          ) : summaryQuery.isError ? (
            <p className={ERROR_CLS}>Não foi possível gerar a recomendação.</p>
          ) : summaryQuery.data ? (
            <div className="space-y-2.5">
              <div className="flex items-center gap-2">
                <span
                  className={`${CHIP_CLS} capitalize ${
                    SENTIMENT_STYLE[summaryQuery.data.sentiment] ??
                    SENTIMENT_STYLE.neutro
                  }`}
                >
                  {summaryQuery.data.sentiment}
                </span>
              </div>
              <p className="text-sm leading-relaxed text-foreground">
                {summaryQuery.data.summary}
              </p>
              {summaryQuery.data.objection && (
                <p className="flex items-start gap-1.5 rounded-lg bg-warning-wash p-2 text-xs text-warning-ink">
                  <AlertTriangle aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>
                    <span className="font-semibold">Objeção: </span>
                    {summaryQuery.data.objection}
                  </span>
                </p>
              )}
              {Array.isArray(summaryQuery.data.replies) &&
                summaryQuery.data.replies.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-[11px] font-medium text-muted-foreground">
                      Respostas sugeridas
                    </p>
                    {summaryQuery.data.replies.map((r, i) => (
                      <p
                        key={i}
                        className="rounded-lg border border-border bg-card px-2 py-1.5 text-xs text-foreground"
                      >
                        {typeof r === 'string' ? r : String(r)}
                      </p>
                    ))}
                  </div>
                )}
            </div>
          ) : (
            <p className={HINT_CLS}>Sem recomendação.</p>
          )}
        </Section>

        {/* Resumo da última ligação (Sonax) */}
        {conversationId && <CallInsightBlock conversationId={conversationId} />}
      </div>
    </Dialog>
  );
}
