'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Clock, Download, ExternalLink, ChevronLeft, ChevronRight, CalendarClock, Loader2, UserRound,
} from 'lucide-react';
import { toast } from 'sonner';
import { useInactivityReport, useInactivitySettings } from '../hooks/use-inactivity';
import { schedulingService } from '../services/scheduling.service';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';

const PAGE_SIZE = 20;

// Warmer as the band index grows (more stale).
const BAND_COLORS = ['#10b981', '#f59e0b', '#f97316', '#ef4444', '#b91c1c', '#7f1d1d'];
function bandColor(i: number): string {
  return BAND_COLORS[Math.min(i, BAND_COLORS.length - 1)];
}

function bandLabel(bands: number[] | undefined, units: ('DAYS' | 'HOURS')[] | undefined, i: number): string {
  if (!bands || i < 0 || i >= bands.length) return `Faixa ${i}`;
  const at = (idx: number) => `${bands[idx]}${(units?.[idx] ?? 'DAYS') === 'HOURS' ? 'h' : 'd'}`;
  return bands[i + 1] != null ? `${at(i)}–${at(i + 1)}` : `${at(i)}+`;
}

export function InactivityReport() {
  const [band, setBand] = useState<number | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);

  const { data: settings } = useInactivitySettings();
  const bands = settings?.bandsDays;
  const units = settings?.bandsUnits;

  const { data, isLoading, isFetching, isError, error } = useInactivityReport({ band, page });

  const selectBand = (b: number | undefined) => {
    setBand(b);
    setPage(1);
  };

  const items = data?.items ?? [];
  const pageSize = data?.pageSize ?? PAGE_SIZE;
  const byBandMap = new Map((data?.byBand ?? []).map((b) => [b.band, b.count]));
  // Show a card per configured band; fall back to whatever byBand returned.
  const bandIndexes = bands
    ? bands.map((_, i) => i)
    : (data?.byBand ?? []).map((b) => b.band);
  const totalStale = (data?.byBand ?? []).reduce((sum, b) => sum + b.count, 0);

  const exportCsv = async () => {
    setExporting(true);
    try {
      const token = localStorage.getItem('access_token');
      const orgId = localStorage.getItem('active_org_id');
      const res = await fetch(schedulingService.reportCsvUrl(), {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(orgId ? { 'x-organization-id': orgId } : {}),
        },
      });
      if (!res.ok) throw new Error(`Falha ao exportar (${res.status})`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `inatividade-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao exportar CSV');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl p-4 lg:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-foreground">
            <Clock className="h-6 w-6 text-primary" />
            Inatividade de clientes
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Conversas sem interação recente, agrupadas por faixa de dias parados.
          </p>
        </div>
        <Button type="button" variant="outline" onClick={exportCsv} loading={exporting}>
          {!exporting && <Download aria-hidden="true" className="h-4 w-4" />}
          Exportar CSV
        </Button>
      </div>

      {/* Band filter cards */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <button
          type="button"
          onClick={() => selectBand(undefined)}
          aria-pressed={band === undefined}
          className={`rounded-xl border px-4 py-3 text-left transition-colors ${
            band === undefined
              ? 'border-primary bg-primary/5 ring-1 ring-primary'
              : 'border-border bg-card hover:border-input'
          }`}
        >
          <span className="text-xs font-medium text-muted-foreground">Todos</span>
          <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-foreground">{totalStale}</p>
        </button>
        {bandIndexes.map((i) => {
          const active = band === i;
          const color = bandColor(i);
          return (
            <button
              key={i}
              type="button"
              onClick={() => selectBand(active ? undefined : i)}
              aria-pressed={active}
              className={`rounded-xl border px-4 py-3 text-left transition-colors ${
                active
                  ? 'border-primary bg-primary/5 ring-1 ring-primary'
                  : 'border-border bg-card hover:border-input'
              }`}
            >
              <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                {bandLabel(bands, units, i)}
              </span>
              <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-foreground">
                {byBandMap.get(i) ?? 0}
              </p>
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div className="mt-6 overflow-hidden rounded-xl border border-border bg-card shadow-soft">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3">Contato</th>
                <th className="px-4 py-3">Canal</th>
                <th className="px-4 py-3">Responsável</th>
                <th className="px-4 py-3 text-right">Tempo parado</th>
                <th className="px-4 py-3">Faixa</th>
                <th className="px-4 py-3">Agendamento</th>
                <th className="px-4 py-3"><span className="sr-only">Ações</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={7} className="px-4 py-3">
                      <div className="h-5 animate-pulse rounded bg-muted" />
                    </td>
                  </tr>
                ))
              ) : isError ? (
                <tr>
                  <td colSpan={7} role="alert" className="px-4 py-10 text-center text-sm text-urgent-ink">
                    {error instanceof Error ? error.message : 'Erro ao carregar o relatório'}
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4">
                    <EmptyState
                      icon={CalendarClock}
                      size="sm"
                      title="Nenhuma conversa inativa nesta faixa"
                      description="Escolha outra faixa acima ou volte mais tarde."
                    />
                  </td>
                </tr>
              ) : (
                items.map((it) => (
                  <tr key={it.conversationId} className="text-foreground">
                    <td className="px-4 py-3">
                      <span className="font-medium text-foreground">
                        {it.contact?.name ?? 'Sem nome'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{it.channel?.name ?? '—'}</td>
                    <td className="px-4 py-3">
                      {it.assignedTo ? (
                        <span className="inline-flex items-center gap-1.5">
                          <UserRound className="h-3.5 w-3.5 text-muted-foreground" />
                          {it.assignedTo.name}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Sem responsável</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">
                      {it.daysStale != null
                        ? `${it.daysStale} ${it.daysStale === 1 ? 'dia' : 'dias'}`
                        : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold"
                        style={{ backgroundColor: `${bandColor(it.band)}22`, color: bandColor(it.band) }}
                      >
                        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: bandColor(it.band) }} />
                        {bandLabel(bands, units, it.band)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {it.hasPendingSchedule ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                          <CalendarClock className="h-3 w-3" /> Agendado
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/inbox?conversationId=${it.conversationId}`}
                        className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                      >
                        Abrir <ExternalLink aria-hidden="true" className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-border px-4 py-3">
          <span className="font-mono text-xs tabular-nums text-muted-foreground">
            Página {data?.page ?? page}
            {isFetching && <Loader2 className="ml-2 inline h-3 w-3 animate-spin text-muted-foreground" />}
          </span>
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || isFetching}
            >
              <ChevronLeft aria-hidden="true" className="h-3.5 w-3.5" /> Anterior
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={items.length < pageSize || isFetching}
            >
              Próxima <ChevronRight aria-hidden="true" className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
