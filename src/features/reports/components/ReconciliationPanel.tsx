'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link2, Loader2, ChevronDown, ChevronRight, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  salesReportsService,
  type OrphanEntry,
  type OrphanSuggestion,
} from '@/features/reports/services/sales-reports.service';

const brl = (v: number | null) =>
  v == null
    ? '—'
    : v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const day = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('pt-BR') : '—';

function ScoreBadge({ score }: { score: number }) {
  const tone =
    score >= 60
      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
      : score >= 40
        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
        : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300';
  return (
    <span className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${tone}`}>
      {score} pts
    </span>
  );
}

function SuggestionRow({
  order,
  s,
  onLink,
  linking,
}: {
  order: OrphanEntry['order'];
  s: OrphanSuggestion;
  onLink: () => void;
  linking: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-md border border-zinc-100 bg-zinc-50/60 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900/40">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-zinc-800 dark:text-zinc-100">
            {s.contactName || 'Contato sem nome'}
          </span>
          <ScoreBadge score={s.score} />
        </div>
        <div className="mt-0.5 flex flex-wrap gap-1">
          {s.reasons.map((r) => (
            <span
              key={r}
              className="rounded bg-zinc-200 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300"
            >
              {r}
            </span>
          ))}
        </div>
      </div>
      <button
        type="button"
        onClick={onLink}
        disabled={linking}
        className="flex shrink-0 items-center gap-1.5 rounded-md bg-primary px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
      >
        {linking ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Link2 className="h-3.5 w-3.5" />
        )}
        Vincular
      </button>
    </div>
  );
}

function OrphanCard({ entry }: { entry: OrphanEntry }) {
  const queryClient = useQueryClient();
  const [linkingCard, setLinkingCard] = useState<string | null>(null);

  const linkMut = useMutation({
    mutationFn: (cardId: string) =>
      salesReportsService.linkReconciliation(entry.order.externalId, cardId),
    onMutate: (cardId: string) => setLinkingCard(cardId),
    onSuccess: () => {
      toast.success('Pedido vinculado ao card — negócio marcado como Ganho! 🏆');
      queryClient.invalidateQueries({ queryKey: ['reconciliation'] });
      queryClient.invalidateQueries({ queryKey: ['pipelines'] });
    },
    onError: (err: any) => {
      toast.error(
        err?.response?.data?.message || 'Não consegui vincular. Tenta de novo.',
      );
    },
    onSettled: () => setLinkingCard(null),
  });

  const { order, suggestions } = entry;
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Pedido {order.pedido ? `#${order.pedido}` : '(sem número)'}
        </div>
        <div className="text-xs text-zinc-500 dark:text-zinc-400">
          {order.cliente || 'cliente ?'} · {brl(order.venda)} · {day(order.data)}
        </div>
      </div>
      {suggestions.length === 0 ? (
        <p className="text-xs italic text-zinc-400">
          Sem candidatos por heurística — vincule manualmente pelo funil.
        </p>
      ) : (
        <div className="space-y-1.5">
          {suggestions.map((s) => (
            <SuggestionRow
              key={s.cardId}
              order={order}
              s={s}
              linking={linkMut.isPending && linkingCard === s.cardId}
              onLink={() => linkMut.mutate(s.cardId)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * E5.2c — Fila de reconciliação: pedidos do HUB que não casaram por nº exato.
 * Cada um mostra os cards candidatos (heurística) com um botão pra vincular.
 * Admin-only (o backend já restringe a OWNER/ADMIN).
 */
export function ReconciliationPanel() {
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ['reconciliation'],
    queryFn: () => salesReportsService.listReconciliation(),
  });

  const count = data?.length ?? 0;

  return (
    <section className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-4 py-3"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          {open ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
          Reconciliação de pedidos
          {count > 0 && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
              {count}
            </span>
          )}
        </span>
        {isLoading && <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />}
      </button>

      {open && (
        <div className="border-t border-zinc-100 px-4 py-3 dark:border-zinc-800">
          {isLoading ? (
            <p className="text-sm text-zinc-400">Carregando…</p>
          ) : count === 0 ? (
            <p className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Nenhum pedido pendente de reconciliação.
            </p>
          ) : (
            <div className="space-y-2">
              {data!.map((entry) => (
                <OrphanCard key={entry.order.externalId} entry={entry} />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
