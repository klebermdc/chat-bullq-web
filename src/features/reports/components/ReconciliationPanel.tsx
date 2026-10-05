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
import { getErrorMessage } from '@/lib/errors';
import { Button } from '@/components/ui/button';

const brl = (v: number | null) =>
  v == null
    ? '—'
    : v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const day = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('pt-BR') : '—';

function ScoreBadge({ score }: { score: number }) {
  const tone =
    score >= 60
      ? 'bg-success-wash text-success-ink'
      : score >= 40
        ? 'bg-warning-wash text-warning-ink'
        : 'bg-muted text-muted-foreground';
  return (
    <span className={`shrink-0 whitespace-nowrap rounded-md px-1.5 py-0.5 text-[11px] font-semibold tabular-nums ${tone}`}>
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
    <div className="flex items-center justify-between gap-2 rounded-lg bg-muted px-3 py-2">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-foreground">
            {s.contactName || 'Contato sem nome'}
          </span>
          <ScoreBadge score={s.score} />
        </div>
        <div className="mt-0.5 flex flex-wrap gap-1">
          {s.reasons.map((r) => (
            <span
              key={r}
              className="rounded-md bg-card px-1.5 py-0.5 text-[11px] uppercase tracking-wide text-muted-foreground ring-1 ring-border"
            >
              {r}
            </span>
          ))}
        </div>
      </div>
      <Button size="sm" className="shrink-0" onClick={onLink} loading={linking}>
        {!linking && <Link2 aria-hidden="true" className="h-3.5 w-3.5" />}
        Vincular
      </Button>
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
      toast.success('Pedido vinculado ao card — negócio marcado como Ganho!');
      queryClient.invalidateQueries({ queryKey: ['reconciliation'] });
      queryClient.invalidateQueries({ queryKey: ['pipelines'] });
    },
    onError: (err: any) => {
      toast.error(
        getErrorMessage(err, 'Não consegui vincular. Tenta de novo.'),
      );
    },
    onSettled: () => setLinkingCard(null),
  });

  const { order, suggestions } = entry;
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <div className="text-sm font-semibold text-foreground">
          Pedido {order.pedido ? `#${order.pedido}` : '(sem número)'}
        </div>
        <div className="text-xs tabular-nums text-muted-foreground">
          {order.cliente || 'Cliente não informado'} · {brl(order.venda)} · {day(order.data)}
        </div>
      </div>
      {suggestions.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Nenhum card parecido encontrado — vincule manualmente pelo funil.
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
    <section className="rounded-xl border border-border bg-card shadow-soft">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex min-h-11 w-full items-center justify-between gap-2 rounded-xl px-4 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
          {open ? (
            <ChevronDown aria-hidden="true" className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight aria-hidden="true" className="h-4 w-4 text-muted-foreground" />
          )}
          Reconciliação de pedidos
          {count > 0 && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold tabular-nums text-primary">
              {count}
            </span>
          )}
        </span>
        {isLoading && <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin text-muted-foreground" />}
      </button>

      {open && (
        <div className="border-t border-border px-4 py-3">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          ) : count === 0 ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 aria-hidden="true" className="h-4 w-4 text-success-ink" />
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
