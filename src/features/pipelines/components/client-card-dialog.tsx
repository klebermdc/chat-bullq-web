'use client';

import { useQuery } from '@tanstack/react-query';
import {
  X,
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
} from '../services/pipelines.service';

interface Props {
  open: boolean;
  card: CardSummary | null;
  onClose: () => void;
  onOpenConversation: (conversationId: string) => void;
  onEdit: (card: CardSummary) => void;
}

const formatBRL = (v: number | string | null | undefined, currency = 'BRL') => {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'string' ? parseFloat(v) : v;
  if (Number.isNaN(n)) return null;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(n);
};

const formatDate = (iso: string | null | undefined) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
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
  satisfeito:
    'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  neutro: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300',
  irritado: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
};

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
    <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/50">
      <div className="mb-2 flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-500">
          {icon}
          {title}
        </p>
        {action}
      </div>
      {children}
    </div>
  );
}

export function ClientCardDialog({
  open,
  card,
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

  if (!open || !card) return null;

  const contact = card.contact;
  const assignedTo = card.assignedTo;
  const cardValue = formatBRL(card.value);
  const proposal = proposalQuery.data;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-xl bg-white shadow-xl dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                {contact?.name || contact?.phone || card.title}
              </h3>
              {card.conversation?.temperature ? (
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                    card.conversation.temperature >= 3
                      ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
                      : card.conversation.temperature === 2
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
                        : 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-400'
                  }`}
                  title="Termômetro do lead"
                >
                  {card.conversation.temperature >= 3
                    ? '🔥 Quente'
                    : card.conversation.temperature === 2
                      ? '🌤️ Morno'
                      : '🧊 Frio'}
                </span>
              ) : null}
              {card.status === 'WON' && (
                <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold uppercase text-green-700 dark:bg-green-900/40 dark:text-green-400">
                  ganho
                </span>
              )}
              {card.status === 'LOST' && (
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold uppercase text-red-700 dark:bg-red-900/40 dark:text-red-400">
                  perdido
                </span>
              )}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-zinc-500">
              {contact?.phone && <span>{contact.phone}</span>}
              {cardValue && (
                <span className="font-medium text-emerald-600 dark:text-emerald-400">
                  {cardValue}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-3 overflow-y-auto px-6 py-4">
          {/* Atendente */}
          <Section title="Atendente" icon={<User className="h-3.5 w-3.5" />}>
            {assignedTo ? (
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                  {assignedTo.name.slice(0, 2).toUpperCase()}
                </span>
                <span className="text-sm text-zinc-800 dark:text-zinc-200">
                  {assignedTo.name}
                </span>
              </div>
            ) : (
              <p className="text-sm text-zinc-400">Sem atendente atribuído</p>
            )}
          </Section>

          {/* Proposta enviada */}
          <Section
            title="Proposta enviada"
            icon={<Ticket className="h-3.5 w-3.5" />}
          >
            {proposalQuery.isLoading ? (
              <p className="text-sm text-zinc-400">Carregando proposta…</p>
            ) : proposalQuery.isError ? (
              <p className="text-sm text-red-500">Erro ao carregar a proposta.</p>
            ) : !proposal ? (
              <p className="text-sm text-zinc-400">
                Nenhuma proposta enviada ainda.
              </p>
            ) : (
              <div className="space-y-2">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                    {formatBRL(proposal.totalValue, proposal.currency) ?? '—'}
                  </span>
                  {relativeFrom(proposal.createdAt) && (
                    <span className="text-[11px] text-zinc-400">
                      enviada {relativeFrom(proposal.createdAt)}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs text-zinc-600 dark:text-zinc-300">
                  <span className="flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-zinc-400" />
                    {proposal.adults} adulto(s)
                    {proposal.children > 0
                      ? `, ${proposal.children} criança(s)`
                      : ''}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CalendarDays className="h-3.5 w-3.5 text-zinc-400" />
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
                          className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
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
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            )}
          </Section>

          {/* Recomendação da IA */}
          <Section
            title="Recomendação da IA"
            icon={<Sparkles className="h-3.5 w-3.5" />}
            action={
              conversationId ? (
                <button
                  onClick={() => summaryQuery.refetch()}
                  disabled={summaryQuery.isFetching}
                  className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-zinc-500 hover:bg-zinc-100 disabled:opacity-50 dark:hover:bg-zinc-800"
                  title="Regenerar recomendação"
                >
                  <RefreshCw
                    className={`h-3 w-3 ${summaryQuery.isFetching ? 'animate-spin' : ''}`}
                  />
                  Regenerar
                </button>
              ) : undefined
            }
          >
            {!conversationId ? (
              <p className="text-sm text-zinc-400">
                Vincule uma conversa a este card para gerar a recomendação.
              </p>
            ) : summaryQuery.isLoading ? (
              <p className="text-sm text-zinc-400">
                A IA está analisando a conversa…
              </p>
            ) : summaryQuery.isError ? (
              <p className="text-sm text-red-500">
                Não foi possível gerar a recomendação.
              </p>
            ) : summaryQuery.data ? (
              <div className="space-y-2.5">
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${
                      SENTIMENT_STYLE[summaryQuery.data.sentiment] ??
                      SENTIMENT_STYLE.neutro
                    }`}
                  >
                    {summaryQuery.data.sentiment}
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-200">
                  {summaryQuery.data.summary}
                </p>
                {summaryQuery.data.objection && (
                  <p className="flex items-start gap-1.5 rounded-md bg-amber-50 p-2 text-xs text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>
                      <span className="font-semibold">Objeção: </span>
                      {summaryQuery.data.objection}
                    </span>
                  </p>
                )}
                {Array.isArray(summaryQuery.data.replies) &&
                  summaryQuery.data.replies.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-[11px] font-medium text-zinc-400">
                        Respostas sugeridas
                      </p>
                      {summaryQuery.data.replies.map((r, i) => (
                        <p
                          key={i}
                          className="rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-xs text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                        >
                          {typeof r === 'string' ? r : String(r)}
                        </p>
                      ))}
                    </div>
                  )}
              </div>
            ) : (
              <p className="text-sm text-zinc-400">Sem recomendação.</p>
            )}
          </Section>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 border-t border-zinc-200 bg-zinc-50 px-6 py-3 dark:border-zinc-800 dark:bg-zinc-900/50">
          <button
            onClick={() => onEdit(card)}
            className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <Pencil className="h-3.5 w-3.5" />
            Editar card
          </button>
          {conversationId && (
            <button
              onClick={() => onOpenConversation(conversationId)}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              Abrir conversa
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
