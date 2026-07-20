'use client';

import { useEffect, useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Channel } from '../services/channels.service';
import {
  channelUsageService,
  type UsageBucket,
  type PricingConfig,
} from '../services/channel-usage.service';

const CATEGORIES = ['marketing', 'utility', 'authentication', 'service'] as const;

interface Props {
  channel: Channel | null;
  onClose: () => void;
  onSaved?: () => void;
}

export function ChannelUsageDialog({ channel, onClose, onSaved }: Props) {
  const [buckets, setBuckets] = useState<UsageBucket[]>([]);
  const [pricing, setPricing] = useState<PricingConfig>({ currency: 'BRL', rates: {} });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!channel) return;
    setLoading(true);
    Promise.all([
      channelUsageService.timeseries({ channelId: channel.id, bucket: 'day' }),
      channelUsageService.getPricing(),
    ])
      .then(([ts, pr]) => {
        setBuckets(ts);
        setPricing(pr);
      })
      .catch(() => toast.error('Erro ao carregar uso do canal'))
      .finally(() => setLoading(false));
  }, [channel]);

  if (!channel) return null;

  const handleSavePricing = async () => {
    setSaving(true);
    try {
      await channelUsageService.setPricing(pricing);
      const ts = await channelUsageService.timeseries({ channelId: channel.id, bucket: 'day' });
      setBuckets(ts);
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
              <strong>{monthTotal}</strong> janelas este mês · custo estimado{' '}
              <strong>~{cur} {monthCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
            </p>

            <h3 className="mb-1 text-xs font-semibold uppercase text-zinc-400">Por dia</h3>
            <div className="mb-5 overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
              <table className="w-full text-xs">
                <thead className="bg-zinc-50 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                  <tr>
                    <th className="px-2 py-1.5 text-left">Dia</th>
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
      </div>
    </div>
  );
}
