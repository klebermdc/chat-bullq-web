'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, X, Clock, Info, Loader2, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/auth-store';
import { useInactivitySettings, useUpdateInactivitySettings } from '../hooks/use-inactivity';
import { pipelinesService } from '@/features/pipelines/services/pipelines.service';
import type { InactivitySettings } from '../types';

const inputCls =
  'w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100';

const HOURS = Array.from({ length: 24 }, (_, i) => i);

type Unit = 'DAYS' | 'HOURS';
const bandHours = (value: number, unit: Unit) => (unit === 'HOURS' ? value : value * 24);
const unitSuffix = (unit: Unit) => (unit === 'HOURS' ? 'h' : 'd');

function bandLabel(days: number[], units: Unit[], i: number): string {
  if (i < 0 || i >= days.length) return `Faixa ${i}`;
  const at = (idx: number) => `${days[idx]}${unitSuffix(units[idx] ?? 'DAYS')}`;
  const from = at(i);
  return days[i + 1] != null ? `${from}–${at(i + 1)}` : `${from}+`;
}

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
        checked ? 'bg-primary' : 'bg-zinc-300 dark:bg-zinc-700'
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
}

function Row({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{title}</p>
        {description && <p className="mt-0.5 text-xs text-zinc-500">{description}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export function InactivitySettingsForm() {
  const role = useAuthStore((s) => s.organizations.find((o) => o.id === s.activeOrgId)?.role ?? null);
  const canEdit = role === 'OWNER' || role === 'ADMIN';

  const { data, isLoading, isError, error } = useInactivitySettings();
  const update = useUpdateInactivitySettings();

  const [form, setForm] = useState<InactivitySettings | null>(null);

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  const dirty = useMemo(() => {
    if (!form || !data) return false;
    return JSON.stringify(form) !== JSON.stringify(data);
  }, [form, data]);

  // Seletor da "etapa ao esgotar": lista de funis + etapas do funil escolhido.
  const { data: pipelines = [] } = useQuery({
    queryKey: ['pipelines'],
    queryFn: () => pipelinesService.list(),
  });
  const [pipelineId, setPipelineId] = useState<string | null>(null);
  useEffect(() => {
    if (pipelineId || pipelines.length === 0) return;
    const def = pipelines.find((p) => p.isDefault) ?? pipelines[0];
    if (def) setPipelineId(def.id);
  }, [pipelines, pipelineId]);
  const { data: board } = useQuery({
    queryKey: ['pipeline-board', pipelineId],
    queryFn: () => pipelinesService.getBoard(pipelineId!),
    enabled: !!pipelineId,
  });
  const stages = board?.stages ?? [];

  if (isLoading || !form) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-14 animate-pulse rounded-lg border bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-400">
        {error instanceof Error ? error.message : 'Erro ao carregar as configurações'}
      </div>
    );
  }

  const set = <K extends keyof InactivitySettings>(key: K, value: InactivitySettings[K]) =>
    setForm((f) => (f ? { ...f, [key]: value } : f));

  const setBand = (i: number, value: number) =>
    setForm((f) => (f ? { ...f, bandsDays: f.bandsDays.map((b, idx) => (idx === i ? value : b)) } : f));

  const setBandUnit = (i: number, unit: Unit) =>
    setForm((f) => (f ? { ...f, bandsUnits: f.bandsUnits.map((u, idx) => (idx === i ? unit : u)) } : f));

  const addBand = () =>
    setForm((f) => {
      if (!f) return f;
      const lastUnit: Unit = f.bandsUnits[f.bandsUnits.length - 1] ?? 'DAYS';
      const last = f.bandsDays[f.bandsDays.length - 1] ?? 0;
      const step = lastUnit === 'HOURS' ? 6 : 7;
      return {
        ...f,
        bandsDays: [...f.bandsDays, last + step],
        bandsUnits: [...f.bandsUnits, lastUnit],
      };
    });

  const removeBand = (i: number) =>
    setForm((f) => {
      if (!f || f.bandsDays.length <= 1) return f;
      const bandsDays = f.bandsDays.filter((_, idx) => idx !== i);
      const bandsUnits = f.bandsUnits.filter((_, idx) => idx !== i);
      const reengageFromBand = Math.min(f.reengageFromBand, bandsDays.length - 1);
      return { ...f, bandsDays, bandsUnits, reengageFromBand };
    });

  const save = () => {
    if (!form) return;
    // Junta valor+unidade, descarta vazios e ordena por tempo ABSOLUTO (o
    // backend também reordena) — ex.: 12h vem antes de 1d.
    const pairs = form.bandsDays
      .map((value, i) => ({ value, unit: (form.bandsUnits[i] ?? 'DAYS') as Unit }))
      .filter((p) => Number.isFinite(p.value) && p.value > 0)
      .sort((a, b) => bandHours(a.value, a.unit) - bandHours(b.value, b.unit));
    if (!pairs.length) {
      toast.error('Defina ao menos uma faixa');
      return;
    }
    for (let i = 1; i < pairs.length; i++) {
      if (bandHours(pairs[i].value, pairs[i].unit) <= bandHours(pairs[i - 1].value, pairs[i - 1].unit)) {
        toast.error('Há faixas com o mesmo tempo. Ajuste os valores.');
        return;
      }
    }
    const bandsDays = pairs.map((p) => p.value);
    const bandsUnits = pairs.map((p) => p.unit);
    // Re-clamp reengageFromBand: limpar/remover faixas pode ter encurtado o
    // array, deixando o índice fora do range (o backend rejeitaria).
    const reengageFromBand = Math.min(Math.max(0, form.reengageFromBand), bandsDays.length - 1);
    update.mutate(
      {
        enabled: form.enabled,
        bandsDays,
        bandsUnits,
        autoReengage: form.autoReengage,
        reengageFromBand,
        maxAttempts: Math.max(1, form.maxAttempts),
        retryEveryHours: Math.max(1, form.retryEveryHours),
        quietHoursStart: form.quietHoursStart,
        quietHoursEnd: form.quietHoursEnd,
        reengageOnlyAiParked: form.reengageOnlyAiParked,
        exhaustedStageId: form.exhaustedStageId,
      },
      {
        onSuccess: () => toast.success('Configurações salvas'),
        onError: (e) => toast.error(e instanceof Error ? e.message : 'Erro ao salvar'),
      },
    );
  };

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            <Clock className="h-5 w-5 text-primary" />
            Inatividade &amp; Reengajamento
          </h2>
          <p className="mt-0.5 text-sm text-zinc-500">
            Defina quando um cliente é considerado inativo e como reengajá-lo automaticamente.
          </p>
        </div>
      </div>

      {!canEdit && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
          <Lock className="h-3.5 w-3.5 shrink-0" />
          Apenas donos e administradores podem alterar estas configurações.
        </div>
      )}

      <div className="mt-4 divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white px-5 dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
        <Row
          title="Monitorar inatividade"
          description="Classifica conversas por tempo sem interação do cliente."
        >
          <Toggle checked={form.enabled} disabled={!canEdit} onChange={(v) => set('enabled', v)} />
        </Row>

        <div className="py-4">
          <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Faixas de inatividade</p>
          <p className="mt-0.5 text-xs text-zinc-500">
            Cada faixa pode ser em horas (h) ou dias (d) — misture como quiser (ex.: 3h, 6h, 12h, 3d). São ordenadas por tempo automaticamente.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {form.bandsDays.map((band, i) => (
              <div
                key={i}
                className="flex items-center gap-1 rounded-md border border-zinc-300 bg-white pl-2 dark:border-zinc-700 dark:bg-zinc-800"
              >
                <input
                  type="number"
                  min={1}
                  value={band}
                  disabled={!canEdit}
                  onChange={(e) => setBand(i, Number(e.target.value))}
                  className="w-12 bg-transparent py-1.5 text-sm text-zinc-800 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 dark:text-zinc-200"
                />
                <select
                  value={form.bandsUnits[i] ?? 'DAYS'}
                  disabled={!canEdit}
                  onChange={(e) => setBandUnit(i, e.target.value as Unit)}
                  className="bg-transparent py-1.5 pr-1 text-xs text-zinc-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 dark:text-zinc-400"
                  title="Unidade desta faixa"
                >
                  <option value="HOURS">h</option>
                  <option value="DAYS">d</option>
                </select>
                {canEdit && form.bandsDays.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeBand(i)}
                    className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-red-500 dark:hover:bg-zinc-700"
                    title="Remover faixa"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
            {canEdit && (
              <button
                type="button"
                onClick={addBand}
                className="inline-flex items-center gap-1 rounded-md border border-dashed border-zinc-300 px-2.5 py-1.5 text-xs font-medium text-zinc-500 hover:border-primary hover:text-primary dark:border-zinc-700"
              >
                <Plus className="h-3.5 w-3.5" /> Faixa
              </button>
            )}
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {form.bandsDays.map((_, i) => (
              <span key={i} className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                {bandLabel(form.bandsDays, form.bandsUnits, i)}
              </span>
            ))}
          </div>
        </div>

        <Row
          title="Reengajar automaticamente"
          description="Agenda uma mensagem de reengajamento quando o cliente entra na faixa configurada."
        >
          <Toggle checked={form.autoReengage} disabled={!canEdit} onChange={(v) => set('autoReengage', v)} />
        </Row>

        <Row
          title="Reengajar apenas leads parados na IA"
          description="Só reengaja quem ainda está com a IA (Aline), sem atendente humano. Se um humano assumir, o reengajamento pendente é cancelado."
        >
          <Toggle
            checked={form.reengageOnlyAiParked}
            disabled={!canEdit || !form.autoReengage}
            onChange={(v) => set('reengageOnlyAiParked', v)}
          />
        </Row>

        <Row
          title="Ao esgotar sem resposta, mover para"
          description="Quando o reengajamento termina e o lead nunca respondeu, o card vai para esta etapa do pipeline (ex.: “Não respondeu”). Cria o card se o lead ainda não tiver um."
        >
          <div className="flex items-center gap-2">
            <select
              value={pipelineId ?? ''}
              disabled={!canEdit || !form.autoReengage}
              onChange={(e) => setPipelineId(e.target.value || null)}
              className={`${inputCls} w-40`}
              title="Funil"
            >
              {pipelines
                .filter((p) => !p.archived)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
            </select>
            <select
              value={form.exhaustedStageId ?? ''}
              disabled={!canEdit || !form.autoReengage || !pipelineId}
              onChange={(e) => set('exhaustedStageId', e.target.value || null)}
              className={`${inputCls} w-44`}
              title="Etapa ao esgotar"
            >
              <option value="">Nenhuma (não mover)</option>
              {stages.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </Row>

        <Row
          title="Reengajar a partir da faixa"
          description="A partir de qual faixa de inatividade o reengajamento automático começa."
        >
          <select
            value={form.reengageFromBand}
            disabled={!canEdit || !form.autoReengage}
            onChange={(e) => set('reengageFromBand', Number(e.target.value))}
            className={`${inputCls} w-40`}
          >
            {form.bandsDays.map((_, i) => (
              <option key={i} value={i}>
                {bandLabel(form.bandsDays, form.bandsUnits, i)}
              </option>
            ))}
          </select>
        </Row>

        <Row
          title="Tentativas máximas"
          description="Quantas mensagens de reengajamento enviar antes de desistir."
        >
          <input
            type="number"
            min={1}
            max={10}
            value={form.maxAttempts}
            disabled={!canEdit || !form.autoReengage}
            onChange={(e) => set('maxAttempts', Number(e.target.value))}
            className={`${inputCls} w-24`}
          />
        </Row>

        <Row
          title="Intervalo entre tentativas (horas)"
          description="Tempo mínimo entre uma tentativa de reengajamento e a próxima."
        >
          <input
            type="number"
            min={1}
            value={form.retryEveryHours}
            disabled={!canEdit || !form.autoReengage}
            onChange={(e) => set('retryEveryHours', Number(e.target.value))}
            className={`${inputCls} w-24`}
          />
        </Row>

        <Row
          title="Horário de silêncio"
          description="Não enviar reengajamentos automáticos nesta janela (opcional)."
        >
          <div className="flex items-center gap-2">
            <select
              value={form.quietHoursStart ?? ''}
              disabled={!canEdit || !form.autoReengage}
              onChange={(e) => set('quietHoursStart', e.target.value === '' ? null : Number(e.target.value))}
              className={`${inputCls} w-24`}
            >
              <option value="">—</option>
              {HOURS.map((h) => (
                <option key={h} value={h}>
                  {String(h).padStart(2, '0')}:00
                </option>
              ))}
            </select>
            <span className="text-xs text-zinc-400">até</span>
            <select
              value={form.quietHoursEnd ?? ''}
              disabled={!canEdit || !form.autoReengage}
              onChange={(e) => set('quietHoursEnd', e.target.value === '' ? null : Number(e.target.value))}
              className={`${inputCls} w-24`}
            >
              <option value="">—</option>
              {HOURS.map((h) => (
                <option key={h} value={h}>
                  {String(h).padStart(2, '0')}:00
                </option>
              ))}
            </select>
          </div>
        </Row>
      </div>

      {canEdit && (
        <div className="mt-5 flex items-center justify-between gap-3">
          <p className="flex items-center gap-1.5 text-xs text-zinc-400">
            <Info className="h-3.5 w-3.5" />
            As alterações valem para toda a organização.
          </p>
          <button
            type="button"
            onClick={save}
            disabled={!dirty || update.isPending}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {update.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Salvar alterações
          </button>
        </div>
      )}
    </div>
  );
}
