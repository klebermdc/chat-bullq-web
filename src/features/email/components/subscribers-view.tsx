'use client';

import { useMemo, useState } from 'react';
import { AlertCircle, Mail, ShoppingBag, Tag, Upload, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { useImport, useSubscribers } from '@/hooks/use-email';
import type { ImportResult, Subscriber, SubscriberStatus } from '@/lib/email-api';
import { TagFilterChips } from '@/features/email/audience/tag-filter-chips';
import { SubscriberTagsEditor } from '@/features/email/audience/subscriber-tags-editor';
import { AUDIENCE_CATEGORY_OPTIONS } from '@/features/email/audience/audience-categories';
import { Button } from '@/components/ui/button';
import { controlCls } from '@/components/ui/control';
import { EmptyState, LoadingState } from '@/components/ui/empty-state';
import { cn } from '@/lib/utils';

const CATEGORY_LABEL: Record<string, string> = Object.fromEntries(
  AUDIENCE_CATEGORY_OPTIONS.map((c) => [c.value, c.label]),
);

const formatBRL = (value: string): string => {
  const n = Number(value);
  if (Number.isNaN(n)) return value;
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
};

/**
 * `GET /email/subscribers` não aceita filtro por etiqueta — filtra na
 * página carregada. "Algum das etiquetas escolhidas" (OU), igual à
 * semântica de `tagIds` no filtro de público de campanha.
 */
function filterByTags(items: Subscriber[], tagIds: string[]): Subscriber[] {
  if (tagIds.length === 0) return items;
  return items.filter((s) => s.tags.some((t) => tagIds.includes(t.id)));
}

const STATUS_FILTERS: Array<{ value: SubscriberStatus | null; label: string }> = [
  { value: null, label: 'Todos' },
  { value: 'SUBSCRIBED', label: 'Inscrito' },
  { value: 'UNSUBSCRIBED', label: 'Descadastrado' },
  { value: 'BOUNCED', label: 'Endereço inválido' },
  { value: 'COMPLAINED', label: 'Marcou como spam' },
];

const STATUS_BADGE: Record<SubscriberStatus, { label: string; className: string }> = {
  SUBSCRIBED: {
    label: 'Inscrito',
    className: 'bg-success-wash text-success-ink',
  },
  UNSUBSCRIBED: {
    label: 'Descadastrado',
    className: 'bg-muted text-muted-foreground',
  },
  BOUNCED: {
    label: 'Endereço inválido',
    className: 'bg-warning-wash text-warning-ink',
  },
  COMPLAINED: {
    label: 'Marcou como spam',
    className: 'bg-urgent-wash text-urgent-ink',
  },
};

function extractErrorMessage(err: unknown): string {
  const data = (err as { response?: { data?: { message?: unknown } } })?.response?.data;
  const msg = data?.message;
  if (Array.isArray(msg)) return msg.join('; ');
  if (typeof msg === 'string' && msg.trim()) return msg;
  const fallback = (err as { message?: unknown })?.message;
  return typeof fallback === 'string' && fallback.trim() ? fallback : 'Erro ao importar.';
}

function reportImportResult(result: ImportResult) {
  const base = `${result.imported} importado(s), ${result.skipped} sem email`;
  if (result.errors.length > 0) {
    toast.warning(`${base} — ${result.errors.length} linha(s) rejeitada(s)`);
  } else {
    toast.success(base);
  }
}

export function SubscribersView() {
  const [statusFilter, setStatusFilter] = useState<SubscriberStatus | null>(null);
  const [tagFilter, setTagFilter] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [csv, setCsv] = useState('');
  const [lastResult, setLastResult] = useState<ImportResult | null>(null);

  const subscribersQ = useSubscribers(statusFilter ?? undefined, page);
  const { contacts, orders, csv: csvImport } = useImport();

  const handleImport = (mutation: { mutateAsync: () => Promise<ImportResult> }) => {
    mutation
      .mutateAsync()
      .then((result) => {
        setLastResult(result);
        reportImportResult(result);
      })
      .catch((err) => toast.error(extractErrorMessage(err)));
  };

  const handleImportCsv = () => {
    if (!csv.trim()) return;
    csvImport
      .mutateAsync(csv)
      .then((result) => {
        setLastResult(result);
        reportImportResult(result);
        setCsv('');
      })
      .catch((err) => toast.error(extractErrorMessage(err)));
  };

  const allItems = subscribersQ.data?.items ?? [];
  const items = useMemo(() => filterByTags(allItems, tagFilter), [allItems, tagFilter]);
  const isImporting = contacts.isPending || orders.isPending || csvImport.isPending;

  return (
    // Título e descrição ficam no cabeçalho da página (/email).
    <div className="space-y-6">
      <section className="space-y-3 rounded-xl border border-border bg-card p-4 shadow-soft">
        <h2 className="text-sm font-semibold text-foreground">
          Importar destinatários
        </h2>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => handleImport(contacts)} disabled={isImporting} loading={contacts.isPending}>
            {!contacts.isPending && <Upload aria-hidden="true" className="h-4 w-4" />}
            {contacts.isPending ? 'Importando…' : 'Importar contatos do CRM'}
          </Button>
          <Button
            variant="outline"
            onClick={() => handleImport(orders)}
            disabled={isImporting}
            loading={orders.isPending}
          >
            {!orders.isPending && <ShoppingBag aria-hidden="true" className="h-4 w-4" />}
            {orders.isPending ? 'Importando…' : 'Importar pedidos do HUB'}
          </Button>
        </div>

        <div className="space-y-2">
          <label htmlFor="subscribers-csv" className="block text-xs font-medium text-muted-foreground">
            Ou cole um CSV (email, nome):
          </label>
          <textarea
            id="subscribers-csv"
            value={csv}
            onChange={(e) => setCsv(e.target.value)}
            placeholder={'email,nome\ncliente@exemplo.com,Maria'}
            rows={4}
            className={cn(controlCls, 'h-auto w-full py-2 font-mono')}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={handleImportCsv}
            disabled={isImporting || !csv.trim()}
            loading={csvImport.isPending}
          >
            {csvImport.isPending ? 'Importando…' : 'Importar CSV'}
          </Button>
        </div>

        {lastResult && (
          <div role="status" className="rounded-lg bg-muted px-3 py-2 text-sm text-foreground">
            <p>
              {lastResult.imported} importado(s), {lastResult.skipped} sem email
            </p>
            {lastResult.errors.length > 0 && (
              <details className="mt-1">
                <summary className="flex cursor-pointer items-center gap-1 text-xs font-medium text-warning-ink">
                  <ShieldAlert className="h-3.5 w-3.5" />
                  {lastResult.errors.length} linha(s) rejeitada(s) — ver detalhes
                </summary>
                <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-xs text-muted-foreground">
                  {lastResult.errors.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        )}
      </section>

      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filtrar por situação">
        {STATUS_FILTERS.map((f) => {
          const active = statusFilter === f.value;
          return (
            <button
              key={f.label}
              type="button"
              aria-pressed={active}
              onClick={() => {
                setStatusFilter(f.value);
                setPage(1);
              }}
              className={cn(
                'inline-flex h-8 items-center rounded-full px-3 text-xs font-medium transition-colors',
                active
                  ? 'bg-primary/10 text-primary ring-1 ring-primary/30'
                  : 'bg-muted text-muted-foreground hover:text-foreground',
              )}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      <div className="space-y-1.5">
        <span className="block text-xs font-medium text-muted-foreground">Filtrar por etiqueta</span>
        <TagFilterChips selectedIds={tagFilter} onChange={setTagFilter} />
        {tagFilter.length > 0 && (
          <p className="text-[11px] text-muted-foreground">
            Filtro aplicado só sobre esta página já carregada — não muda a paginação.
          </p>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-soft">
        {subscribersQ.isLoading && <LoadingState />}
        {subscribersQ.isError && (
          <p role="alert" className="flex items-center justify-center gap-2 p-6 text-sm text-urgent-ink">
            <AlertCircle aria-hidden="true" className="h-4 w-4 shrink-0" />
            Não foi possível carregar os destinatários. Recarregue a página para tentar de novo.
          </p>
        )}
        {!subscribersQ.isLoading && !subscribersQ.isError && allItems.length === 0 && (
          <EmptyState
            icon={Mail}
            title="Nenhum destinatário ainda"
            description="Importe os contatos do CRM ou os pedidos do HUB no quadro acima."
            size="sm"
          />
        )}
        {allItems.length > 0 && items.length === 0 && (
          <EmptyState
            icon={Tag}
            title="Ninguém nesta página tem as etiquetas escolhidas"
            description="O filtro de etiqueta olha só a página carregada — limpe o filtro ou mude de página."
            action={
              <Button variant="outline" size="sm" onClick={() => setTagFilter([])}>
                Limpar filtro de etiqueta
              </Button>
            }
            size="sm"
          />
        )}
        {items.length > 0 && (
          <ul className="divide-y divide-border">
            {items.map((s) => {
              const badge = STATUS_BADGE[s.status];
              return (
                <li key={s.id} className="space-y-2 px-4 py-3">
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {s.name || s.email}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{s.email}</p>
                      {s.consentSource && (
                        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                          Consentimento: {s.consentSource}
                        </p>
                      )}
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${badge.className}`}>
                      {badge.label}
                    </span>
                  </div>

                  <SubscriberEnrichment subscriber={s} />

                  <SubscriberTagsEditor subscriberId={s.id} tags={s.tags} />
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {subscribersQ.data && subscribersQ.data.total > allItems.length && (
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Anterior
          </Button>
          <span className="font-mono text-xs tabular-nums text-muted-foreground">
            Página {page} de {Math.max(1, Math.ceil(subscribersQ.data.total / subscribersQ.data.limit))}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => p + 1)}
            disabled={page * (subscribersQ.data?.limit ?? 50) >= (subscribersQ.data?.total ?? 0)}
          >
            Próxima
          </Button>
        </div>
      )}
    </div>
  );
}

/**
 * O que o pedido enriquecido ensina sobre este destinatário. `enrichedAt`
 * é o que impede o operador de achar que está vendo número de hoje: os
 * dados são congelados na importação, não ao vivo — sem a data, não dá
 * pra saber se "3 pedidos" é de ontem ou de um mês atrás.
 */
function SubscriberEnrichment({ subscriber }: { subscriber: Subscriber }) {
  if (!subscriber.enrichedAt && subscriber.orderCount === 0) {
    return <p className="text-[11px] text-muted-foreground">Sem dados de compra — nunca sincronizado com o HUB.</p>;
  }

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
      <span>
        Última compra:{' '}
        {subscriber.lastPurchaseAt
          ? new Date(subscriber.lastPurchaseAt).toLocaleDateString('pt-BR')
          : '—'}
      </span>
      <span>
        Total gasto: <span className="font-mono tabular-nums">{formatBRL(subscriber.totalSpent)}</span>
      </span>
      <span>
        {subscriber.orderCount} pedido{subscriber.orderCount === 1 ? '' : 's'}
      </span>
      {subscriber.categories.length > 0 && (
        <span>
          {subscriber.categories.map((c) => CATEGORY_LABEL[c] ?? c).join(', ')}
        </span>
      )}
      <span className="opacity-80">
        {subscriber.enrichedAt
          ? `Sincronizado em ${new Date(subscriber.enrichedAt).toLocaleString('pt-BR')}`
          : 'Nunca sincronizado'}
      </span>
    </div>
  );
}
