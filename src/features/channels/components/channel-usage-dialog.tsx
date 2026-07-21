'use client';

import { useCallback, useEffect, useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Channel } from '../services/channels.service';
import {
  channelUsageService,
  type UsageBucket,
  type PricingConfig,
} from '../services/channel-usage.service';

const CATEGORIES = ['marketing', 'utility', 'authentication', 'service'] as const;

type RangeKey = 'this-month' | 'last-month' | 'last-3-months' | 'this-year';

const RANGE_OPTIONS: { value: RangeKey; label: string }[] = [
  { value: 'this-month', label: 'Este mês' },
  { value: 'last-month', label: 'Mês passado' },
  { value: 'last-3-months', label: 'Últimos 3 meses' },
  { value: 'this-year', label: 'Este ano' },
];

function rangeToDates(key: string): { from: string; to: string } {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  switch (key) {
    case 'last-month':
      return { from: iso(new Date(Date.UTC(y, m - 1, 1))), to: iso(new Date(Date.UTC(y, m, 1))) };
    case 'last-3-months':
      return { from: iso(new Date(Date.UTC(y, m - 2, 1))), to: iso(new Date(Date.UTC(y, m + 1, 1))) };
    case 'this-year':
      return { from: iso(new Date(Date.UTC(y, 0, 1))), to: iso(new Date(Date.UTC(y + 1, 0, 1))) };
    case 'this-month':
    default:
      return { from: iso(new Date(Date.UTC(y, m, 1))), to: iso(new Date(Date.UTC(y, m + 1, 1))) };
  }
}

interface Props {
  channel: Channel | null;
  onClose: () => void;
  onSaved?: () => void;
}

export function ChannelUsageDialog({ channel, onClose, onSaved }: Props) {
  const [buckets, setBuckets] = useState<UsageBucket[]>([]);
  const [pricing, setPricing] = useState<PricingConfig>({ currency: 'BRL', rates: {} });
  const [loading, setLoading] = useState(false);
  const [refetching, setRefetching] = useState(false);
  const [pricingLoaded, setPricingLoaded] = useState(false);
  const [pricingError, setPricingError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [range, setRange] = useState<RangeKey>('this-month');
  const [bucket, setBucket] = useState<'day' | 'month'>('day');

  const loadBuckets = useCallback(() => {
    if (!channel) return;
    const { from, to } = rangeToDates(range);
    setRefetching(true);
    channelUsageService
      .timeseries({ channelId: channel.id, from, to, bucket })
      .then((ts) => setBuckets(ts))
      .catch(() => toast.error('Erro ao carregar uso do canal'))
      .finally(() => {
        setRefetching(false);
        // First resolution clears the initial full-body gate.
        setLoading(false);
      });
  }, [channel, range, bucket]);

  const loadPricing = useCallback(() => {
    if (!channel) return;
    // Reset so the tariff form can never render/submit against stale or
    // default rates until this channel's real pricing has loaded.
    setPricingLoaded(false);
    setPricingError(false);
    channelUsageService
      .getPricing()
      .then((pr) => {
        setPricing(pr);
        setPricingLoaded(true);
      })
      .catch(() => {
        setPricingError(true);
        toast.error('Erro ao carregar tarifas do canal');
      });
  }, [channel]);

  // Initial full-body loading gate: only when the dialog (re)opens for a channel.
  useEffect(() => {
    if (!channel) return;
    setLoading(true);
  }, [channel]);

  useEffect(() => {
    loadBuckets();
  }, [loadBuckets]);

  useEffect(() => {
    loadPricing();
  }, [loadPricing]);

  if (!channel) return null;

  const handleSavePricing = async () => {
    setSaving(true);
    try {
      await channelUsageService.setPricing(pricing);
      loadBuckets();
      onSaved?.();
      toast.success('Tarifas salvas');
    } catch {
      toast.error('Erro ao salvar tarifas');
    } finally {
      setSaving(false);
    }
  };

  const monthTotal = buckets.reduce((s, b) => s + b.total, 0);
  const monthCost = buckets.reduce((s, b) => s + b.estimatedCost, 0);
  const cur = pricing.currency === 'BRL' ? 'R$' : pricing.currency;

  const presentCats = Array.from(
    new Set(buckets.flatMap((b) => Object.keys(b.byCategory))),
  );
  const displayCats = [
    ...CATEGORIES,
    ...presentCats.filter((c) => !CATEGORIES.includes(c as (typeof CATEGORIES)[number])),
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            Janelas · {channel.name}
          </h2>
          <button onClick={onClose} className="rounded p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800">
            <X className="h-4 w-4" />
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-zinc-400" /></div>
        ) : (
          <>
            <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-300">
              <strong>{monthTotal}</strong> janelas no período · custo estimado{' '}
              <strong>~{cur} {monthCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
            </p>

            <div className="mb-4 flex flex-wrap items-center gap-2">
              <select
                value={range}
                onChange={(e) => {
                  const next = e.target.value as RangeKey;
                  setRange(next);
                  if (next === 'last-3-months' || next === 'this-year') setBucket('month');
                }}
                className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
              >
                {RANGE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <div className="inline-flex overflow-hidden rounded-md border border-zinc-300 dark:border-zinc-700">
                <button
                  type="button"
                  onClick={() => setBucket('day')}
                  className={`px-2.5 py-1 text-sm font-medium ${
                    bucket === 'day'
                      ? 'bg-violet-600 text-white'
                      : 'bg-white text-zinc-600 hover:bg-zinc-50 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'
                  }`}
                >
                  Dia
                </button>
                <button
                  type="button"
                  onClick={() => setBucket('month')}
                  className={`px-2.5 py-1 text-sm font-medium ${
                    bucket === 'month'
                      ? 'bg-violet-600 text-white'
                      : 'bg-white text-zinc-600 hover:bg-zinc-50 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'
                  }`}
                >
                  Mês
                </button>
              </div>
            </div>

            <h3 className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase text-zinc-400">
              {bucket === 'day' ? 'Por dia' : 'Por mês'}
              {refetching && <Loader2 className="h-3 w-3 animate-spin text-zinc-400" />}
            </h3>
            <div className="mb-5 overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
              <table className="w-full text-xs">
                <thead className="bg-zinc-50 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                  <tr>
                    <th className="px-2 py-1.5 text-left">{bucket === 'day' ? 'Dia' : 'Mês'}</th>
                    {displayCats.map((c) => <th key={c} className="px-2 py-1.5 text-right">{c}</th>)}
                    <th className="px-2 py-1.5 text-right">Total</th>
                    <th className="px-2 py-1.5 text-right">Custo</th>
                  </tr>
                </thead>
                <tbody>
                  {buckets.length === 0 && (
                    <tr><td colSpan={displayCats.length + 3} className="px-2 py-3 text-center text-zinc-400">Sem janelas no período</td></tr>
                  )}
                  {buckets.map((b) => (
                    <tr key={b.bucket} className="border-t border-zinc-100 dark:border-zinc-800">
                      <td className="px-2 py-1.5">{b.bucket}</td>
                      {displayCats.map((c) => <td key={c} className="px-2 py-1.5 text-right">{b.byCategory[c] ?? 0}</td>)}
                      <td className="px-2 py-1.5 text-right font-medium">{b.total}</td>
                      <td className="px-2 py-1.5 text-right">{cur} {b.estimatedCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {!pricingLoaded ? (
              pricingError ? (
                <div className="flex items-center justify-between gap-2 rounded-lg border border-zinc-200 px-3 py-3 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                  <span>Não foi possível carregar as tarifas.</span>
                  <button
                    onClick={loadPricing}
                    className="rounded-md bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                  >
                    Tentar novamente
                  </button>
                </div>
              ) : (
                <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-zinc-400" /></div>
              )
            ) : (
              <>
                <h3 className="mb-2 text-xs font-semibold uppercase text-zinc-400">Tarifa por categoria ({cur})</h3>
                <div className="grid grid-cols-2 gap-2">
                  {CATEGORIES.map((c) => (
                    <label key={c} className="flex items-center justify-between gap-2 text-sm">
                      <span className="capitalize text-zinc-600 dark:text-zinc-300">{c}</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={pricing.rates[c] ?? ''}
                        placeholder="0,00"
                        onChange={(e) =>
                          setPricing((p) => ({
                            ...p,
                            rates: { ...p.rates, [c]: parseFloat(e.target.value) || 0 },
                          }))
                        }
                        className="w-24 rounded-md border border-zinc-300 px-2 py-1 text-right text-sm dark:border-zinc-700 dark:bg-zinc-800"
                      />
                    </label>
                  ))}
                </div>
                <button
                  onClick={handleSavePricing}
                  disabled={saving}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-violet-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
                >
                  {saving && <Loader2 className="h-3 w-3 animate-spin" />}
                  Salvar tarifas
                </button>
                <p className="mt-2 text-[11px] text-zinc-400">
                  Categoria sem tarifa conta no volume mas custa 0. Janela de <em>service</em> costuma ser grátis (não-cobrada).
                </p>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
