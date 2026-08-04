'use client';

import { useState } from 'react';
import { Mail, ShoppingBag, Upload, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { useImport, useSubscribers } from '@/hooks/use-email';
import type { ImportResult, SubscriberStatus } from '@/lib/email-api';

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
    className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400',
  },
  UNSUBSCRIBED: {
    label: 'Descadastrado',
    className: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
  },
  BOUNCED: {
    label: 'Endereço inválido',
    className: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400',
  },
  COMPLAINED: {
    label: 'Marcou como spam',
    className: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400',
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

export default function EmailContatosPage() {
  const [statusFilter, setStatusFilter] = useState<SubscriberStatus | null>(null);
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

  const items = subscribersQ.data?.items ?? [];
  const isImporting = contacts.isPending || orders.isPending || csvImport.isPending;

  return (
    <div className="h-full min-h-0 space-y-6 overflow-y-auto p-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          Destinatários de email
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-zinc-500">
          Quem se descadastra, tem o email recusado (endereço inválido) ou marca uma
          mensagem como spam nunca mais recebe email — isso é permanente e protege
          a reputação do remetente.
        </p>
      </div>

      <section className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
          Importar destinatários
        </h2>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleImport(contacts)}
            disabled={isImporting}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            <Upload className="h-4 w-4" />
            {contacts.isPending ? 'Importando…' : 'Importar contatos do CRM'}
          </button>
          <button
            onClick={() => handleImport(orders)}
            disabled={isImporting}
            className="inline-flex items-center gap-2 rounded-lg bg-zinc-800 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-700 dark:hover:bg-zinc-600"
          >
            <ShoppingBag className="h-4 w-4" />
            {orders.isPending ? 'Importando…' : 'Importar pedidos do HUB'}
          </button>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium text-zinc-500">Ou cole um CSV (email, nome):</p>
          <textarea
            value={csv}
            onChange={(e) => setCsv(e.target.value)}
            placeholder={'email,nome\ncliente@exemplo.com,Maria'}
            rows={4}
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-mono dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          />
          <button
            onClick={handleImportCsv}
            disabled={isImporting || !csv.trim()}
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            {csvImport.isPending ? 'Importando…' : 'Importar CSV'}
          </button>
        </div>

        {lastResult && (
          <div className="rounded-lg bg-zinc-50 px-3 py-2 text-sm text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
            <p>
              {lastResult.imported} importado(s), {lastResult.skipped} sem email
            </p>
            {lastResult.errors.length > 0 && (
              <details className="mt-1">
                <summary className="flex cursor-pointer items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-400">
                  <ShieldAlert className="h-3.5 w-3.5" />
                  {lastResult.errors.length} linha(s) rejeitada(s) — ver detalhes
                </summary>
                <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-xs text-zinc-500">
                  {lastResult.errors.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        )}
      </section>

      <div className="flex flex-wrap items-center gap-2">
        {STATUS_FILTERS.map((f) => {
          const active = statusFilter === f.value;
          return (
            <button
              key={f.label}
              onClick={() => {
                setStatusFilter(f.value);
                setPage(1);
              }}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                active
                  ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700'
              }`}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800">
        {subscribersQ.isLoading && (
          <div className="p-6 text-center text-sm text-zinc-500">Carregando…</div>
        )}
        {subscribersQ.isError && (
          <div className="p-6 text-center text-sm text-red-600">
            Erro ao carregar destinatários.
          </div>
        )}
        {!subscribersQ.isLoading && items.length === 0 && (
          <div className="p-10 text-center">
            <Mail className="mx-auto h-10 w-10 text-zinc-300 dark:text-zinc-600" />
            <p className="mt-3 text-sm font-medium text-zinc-600 dark:text-zinc-300">
              Nenhum destinatário ainda
            </p>
            <p className="mt-1 text-xs text-zinc-400">
              Importe do CRM ou dos pedidos acima.
            </p>
          </div>
        )}
        {items.length > 0 && (
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {items.map((s) => {
              const badge = STATUS_BADGE[s.status];
              return (
                <li key={s.id} className="flex items-center gap-4 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {s.name || s.email}
                    </p>
                    <p className="truncate text-xs text-zinc-500">{s.email}</p>
                    {s.consentSource && (
                      <p className="mt-0.5 truncate text-[11px] text-zinc-400">
                        Consentimento: {s.consentSource}
                      </p>
                    )}
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${badge.className}`}>
                    {badge.label}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {subscribersQ.data && subscribersQ.data.total > items.length && (
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-600 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300"
          >
            Anterior
          </button>
          <span className="text-xs text-zinc-400">
            Página {page} de {Math.max(1, Math.ceil(subscribersQ.data.total / subscribersQ.data.limit))}
          </span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={page * (subscribersQ.data?.limit ?? 50) >= (subscribersQ.data?.total ?? 0)}
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-600 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300"
          >
            Próxima
          </button>
        </div>
      )}
    </div>
  );
}
