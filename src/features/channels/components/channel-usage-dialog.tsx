'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Channel } from '../services/channels.service';
import {
  channelUsageService,
  type UsageBucket,
  type PricingConfig,
} from '../services/channel-usage.service';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { controlCls, controlSmCls } from '@/components/ui/control';
import { LoadingState } from '@/components/ui/empty-state';

const CATEGORIES = ['marketing', 'utility', 'authentication', 'service'] as const;

// Categorias de cobrança da Meta, como o time fala.
const CATEGORY_LABELS: Record<string, string> = {
  marketing: 'Marketing',
  utility: 'Utilidade',
  authentication: 'Autenticação',
  service: 'Atendimento',
};
const categoryLabel = (c: string) => CATEGORY_LABELS[c] ?? c;

const TH_CLS = 'px-2 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground';
const SECTION_TITLE_CLS = 'text-xs font-semibold uppercase tracking-wide text-muted-foreground';
const money = (n: number) => n.toLocaleString('pt-BR', { minimumFractionDigits: 2 });

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

  const bucketBtnCls = (active: boolean) =>
    `h-8 px-3 text-xs font-medium transition-colors ${
      active ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:text-foreground'
    }`;

  return (
    <Dialog
      open
      onClose={onClose}
      size="xl"
      title={`Janelas · ${channel.name}`}
      footer={
        !loading && pricingLoaded ? (
          <>
            <Button variant="outline" onClick={onClose}>
              Fechar
            </Button>
            <Button onClick={handleSavePricing} loading={saving}>
              Salvar tarifas
            </Button>
          </>
        ) : undefined
      }
    >
      {loading ? (
        <LoadingState />
      ) : (
        <>
          <p className="mb-4 text-sm text-muted-foreground">
            <strong className="font-mono tabular-nums text-foreground">{monthTotal}</strong> janelas no período · custo estimado{' '}
            <strong className="font-mono tabular-nums text-foreground">~{cur} {money(monthCost)}</strong>
          </p>

          <div className="mb-4 flex flex-wrap items-center gap-2">
            <select
              aria-label="Período"
              value={range}
              onChange={(e) => {
                const next = e.target.value as RangeKey;
                setRange(next);
                if (next === 'last-3-months' || next === 'this-year') setBucket('month');
              }}
              className={controlSmCls}
            >
              {RANGE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <div role="group" aria-label="Agrupar por" className="inline-flex overflow-hidden rounded-lg border border-input">
              <button
                type="button"
                aria-pressed={bucket === 'day'}
                onClick={() => setBucket('day')}
                className={bucketBtnCls(bucket === 'day')}
              >
                Dia
              </button>
              <button
                type="button"
                aria-pressed={bucket === 'month'}
                onClick={() => setBucket('month')}
                className={bucketBtnCls(bucket === 'month')}
              >
                Mês
              </button>
            </div>
          </div>

          <h3 className={`mb-1 flex items-center gap-1.5 ${SECTION_TITLE_CLS}`}>
            {bucket === 'day' ? 'Por dia' : 'Por mês'}
            {refetching && <Loader2 aria-hidden="true" className="h-3 w-3 animate-spin" />}
          </h3>
          <div className="mb-5 overflow-x-auto rounded-lg border border-border">
            <table
              aria-label={bucket === 'day' ? 'Janelas e custo por dia' : 'Janelas e custo por mês'}
              className="w-full text-xs"
            >
              <thead className="bg-muted/60">
                <tr>
                  <th scope="col" className={`${TH_CLS} text-left`}>{bucket === 'day' ? 'Dia' : 'Mês'}</th>
                  {displayCats.map((c) => <th key={c} scope="col" className={`${TH_CLS} text-right`}>{categoryLabel(c)}</th>)}
                  <th scope="col" className={`${TH_CLS} text-right`}>Total</th>
                  <th scope="col" className={`${TH_CLS} text-right`}>Custo</th>
                </tr>
              </thead>
              <tbody className="text-foreground">
                {buckets.length === 0 && (
                  <tr><td colSpan={displayCats.length + 3} className="px-2 py-4 text-center text-muted-foreground">Sem janelas no período</td></tr>
                )}
                {buckets.map((b) => (
                  <tr key={b.bucket} className="border-t border-border">
                    <th scope="row" className="whitespace-nowrap px-2 py-1.5 text-left font-mono font-normal tabular-nums">{b.bucket}</th>
                    {displayCats.map((c) => <td key={c} className="px-2 py-1.5 text-right font-mono tabular-nums">{b.byCategory[c] ?? 0}</td>)}
                    <td className="px-2 py-1.5 text-right font-mono font-medium tabular-nums">{b.total}</td>
                    <td className="whitespace-nowrap px-2 py-1.5 text-right font-mono tabular-nums">{cur} {money(b.estimatedCost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!pricingLoaded ? (
            pricingError ? (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-3 text-xs text-muted-foreground">
                <span>Não foi possível carregar as tarifas.</span>
                <Button variant="outline" size="sm" onClick={loadPricing}>
                  Tentar novamente
                </Button>
              </div>
            ) : (
              <LoadingState label="Carregando tarifas…" className="py-4" />
            )
          ) : (
            <>
              <h3 className={`mb-2 ${SECTION_TITLE_CLS}`}>Tarifa por categoria ({cur})</h3>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {CATEGORIES.map((c) => (
                  <label key={c} className="flex items-center justify-between gap-2 text-sm">
                    <span className="text-foreground">{categoryLabel(c)}</span>
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
                      className={`${controlCls} w-24 text-right font-mono tabular-nums`}
                    />
                  </label>
                ))}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Categoria sem tarifa conta no volume, mas custa 0. Janela de atendimento costuma ser gratuita.
              </p>
            </>
          )}
        </>
      )}
    </Dialog>
  );
}
