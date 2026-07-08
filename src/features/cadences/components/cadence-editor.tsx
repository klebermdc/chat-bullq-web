'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Plus,
  X,
  Info,
  Loader2,
  Lock,
  Repeat,
  AlertTriangle,
  Tag as TagIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/auth-store';
import { pipelinesService } from '@/features/pipelines/services/pipelines.service';
import { tagsService } from '@/features/settings/services/tags.service';
import { channelsService } from '@/features/channels/services/channels.service';
import {
  templatesService,
  type Template,
} from '@/features/templates/services/templates.service';
import { useCadences, useDefaultCadence, useSaveCadence } from '../hooks/use-cadences';
import type { Cadence, CadenceStep, CadenceStepOption } from '../types';

const inputCls =
  'w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100';

const DELAY_OPTIONS = [
  { value: 24, label: '24 horas' },
  { value: 72, label: '3 dias' },
  { value: 120, label: '5 dias' },
  { value: 168, label: '7 dias' },
];

const OPTION_ORDER: CadenceStepOption[] = ['SIM', 'NAO', 'DESCADASTRAR'];
const OPTION_LABEL: Record<CadenceStepOption, string> = {
  SIM: 'Sim',
  NAO: 'Não',
  DESCADASTRAR: 'Não quero mais receber',
};

/** Rodapé numerado auto-anexado à mensagem, na ordem canônica das opções. */
function optionsFooter(options: CadenceStepOption[]): string {
  const enabled = OPTION_ORDER.filter((o) => options.includes(o));
  return enabled.map((o, i) => `${i + 1} - ${OPTION_LABEL[o]}`).join('\n');
}

function delayLabel(hours: number): string {
  const found = DELAY_OPTIONS.find((d) => d.value === hours);
  if (found) return found.label;
  if (hours % 24 === 0) return `${hours / 24} dias`;
  return `${hours} horas`;
}

/** Templates HSM aprovados agregados de todos os canais (dedupe por id). */
function useApprovedTemplates() {
  return useQuery({
    queryKey: ['cadence-approved-templates'],
    queryFn: async () => {
      const channels = await channelsService.list();
      const lists = await Promise.all(
        channels.map((c) =>
          templatesService.list(c.id).catch(() => [] as Template[]),
        ),
      );
      const seen = new Map<string, Template>();
      for (const t of lists.flat()) {
        if (t.status === 'APPROVED' && !seen.has(t.id)) seen.set(t.id, t);
      }
      return [...seen.values()];
    },
  });
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

export function CadenceEditor() {
  const role = useAuthStore(
    (s) => s.organizations.find((o) => o.id === s.activeOrgId)?.role ?? null,
  );
  const canEdit = role === 'OWNER' || role === 'ADMIN';

  const { data: cadences, isLoading: loadingList, isError, error } = useCadences();
  const existing = cadences && cadences.length > 0 ? cadences[0] : undefined;
  const { data: template, isLoading: loadingTemplate } = useDefaultCadence();
  const save = useSaveCadence();

  const { data: pipelines = [] } = useQuery({
    queryKey: ['pipelines'],
    queryFn: () => pipelinesService.list(),
    staleTime: 60_000,
  });
  const { data: tags = [] } = useQuery({
    queryKey: ['tags'],
    queryFn: () => tagsService.list(),
    staleTime: 60_000,
  });
  const { data: templates = [], isLoading: loadingTemplates } = useApprovedTemplates();

  const [form, setForm] = useState<Cadence | null>(null);

  const source = existing ?? template;
  useEffect(() => {
    if (!form && source) setForm(JSON.parse(JSON.stringify(source)) as Cadence);
  }, [source, form]);

  // Etapas do pipeline escolhido (o /pipelines pode não trazer stages embutidas).
  const { data: board } = useQuery({
    queryKey: ['pipeline-board', form?.pipelineId],
    queryFn: () => pipelinesService.getBoard(form!.pipelineId!),
    enabled: !!form?.pipelineId,
    staleTime: 30_000,
  });
  const stages = board?.stages ?? [];

  const dirty = useMemo(() => {
    if (!form || !source) return false;
    return JSON.stringify(form) !== JSON.stringify(source);
  }, [form, source]);

  if ((loadingList || loadingTemplate) && !form) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-14 animate-pulse rounded-lg border bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900"
          />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-400">
        {error instanceof Error ? error.message : 'Erro ao carregar a cadência'}
      </div>
    );
  }

  if (!form) return null;

  const set = <K extends keyof Cadence>(key: K, value: Cadence[K]) =>
    setForm((f) => (f ? { ...f, [key]: value } : f));

  const setStep = <K extends keyof CadenceStep>(
    i: number,
    key: K,
    value: CadenceStep[K],
  ) =>
    setForm((f) =>
      f
        ? { ...f, steps: f.steps.map((s, idx) => (idx === i ? { ...s, [key]: value } : s)) }
        : f,
    );

  const toggleOption = (i: number, opt: CadenceStepOption) =>
    setForm((f) =>
      f
        ? {
            ...f,
            steps: f.steps.map((s, idx) => {
              if (idx !== i) return s;
              const has = s.options.includes(opt);
              const options = has
                ? s.options.filter((o) => o !== opt)
                : OPTION_ORDER.filter((o) => o === opt || s.options.includes(o));
              return { ...s, options };
            }),
          }
        : f,
    );

  const addStep = () =>
    setForm((f) => {
      if (!f) return f;
      const last = f.steps[f.steps.length - 1];
      const step: CadenceStep = {
        order: f.steps.length + 1,
        delayHours: 72,
        content: { text: '' },
        options: last ? [...last.options] : ['SIM', 'NAO', 'DESCADASTRAR'],
        templateId: null,
      };
      return { ...f, steps: [...f.steps, step] };
    });

  const removeStep = (i: number) =>
    setForm((f) =>
      f ? { ...f, steps: f.steps.filter((_, idx) => idx !== i) } : f,
    );

  const doSave = () => {
    if (!form) return;
    if (!form.name.trim()) {
      toast.error('Dê um nome à cadência');
      return;
    }
    if (form.enabled && !form.stageId) {
      toast.error('Escolha a etapa gatilho antes de ativar a cadência');
      return;
    }
    if (!form.steps.length) {
      toast.error('Adicione ao menos um passo');
      return;
    }
    const payload: Cadence = {
      ...form,
      trigger: form.allowManual ? 'BOTH' : 'STAGE_ENTER',
      steps: form.steps.map((s, i) => ({ ...s, order: i + 1 })),
    };
    save.mutate(payload, {
      onSuccess: () => toast.success('Cadência salva'),
      onError: (e) => toast.error(e instanceof Error ? e.message : 'Erro ao salvar'),
    });
  };

  const triggerStageName =
    stages.find((s) => s.id === form.stageId)?.name ?? '—';

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            <Repeat className="h-5 w-5 text-primary" />
            Cadência de Negociação
          </h2>
          <p className="mt-0.5 text-sm text-zinc-500">
            Configure a sequência de toques disparada quando um lead entra na etapa de
            negociação.
          </p>
        </div>
      </div>

      {!canEdit && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
          <Lock className="h-3.5 w-3.5 shrink-0" />
          Apenas donos e administradores podem alterar a cadência.
        </div>
      )}

      {/* Cabeçalho / configuração geral */}
      <div className="mt-4 divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white px-5 dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="py-4">
          <label className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Nome
          </label>
          <input
            type="text"
            value={form.name}
            disabled={!canEdit}
            onChange={(e) => set('name', e.target.value)}
            placeholder="Cadência de Negociação"
            className={`${inputCls} mt-2`}
          />
        </div>

        <Row
          title="Funil"
          description="Funil monitorado para o gatilho da cadência."
        >
          <select
            value={form.pipelineId ?? ''}
            disabled={!canEdit}
            onChange={(e) =>
              setForm((f) =>
                f ? { ...f, pipelineId: e.target.value || null, stageId: null, lostStageId: null } : f,
              )
            }
            className={`${inputCls} w-56`}
          >
            <option value="">Selecione…</option>
            {pipelines
              .filter((p) => !p.archived)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
          </select>
        </Row>

        <Row
          title="Etapa gatilho"
          description="Ao entrar nesta etapa (ex.: Negociação), o lead é inscrito na cadência."
        >
          <select
            value={form.stageId ?? ''}
            disabled={!canEdit || !form.pipelineId}
            onChange={(e) => set('stageId', e.target.value || null)}
            className={`${inputCls} w-56`}
          >
            <option value="">{form.pipelineId ? 'Selecione…' : '— escolha o funil'}</option>
            {stages.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </Row>

        <Row
          title="Etapa Perdido"
          description="Destino do lead quando responde “Não” ou a cadência se esgota."
        >
          <select
            value={form.lostStageId ?? ''}
            disabled={!canEdit || !form.pipelineId}
            onChange={(e) => set('lostStageId', e.target.value || null)}
            className={`${inputCls} w-56`}
          >
            <option value="">Nenhuma</option>
            {stages.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </Row>

        <Row
          title="Tag quente"
          description="Aplicada quando o lead responde “Sim” (quer continuar)."
        >
          <select
            value={form.hotTagId ?? ''}
            disabled={!canEdit}
            onChange={(e) => set('hotTagId', e.target.value || null)}
            className={`${inputCls} w-56`}
          >
            <option value="">Nenhuma</option>
            {tags.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </Row>

        <Row
          title="Tag opt-out"
          description="Aplicada quando o lead pede para não receber mais mensagens."
        >
          <select
            value={form.optOutTagId ?? ''}
            disabled={!canEdit}
            onChange={(e) => set('optOutTagId', e.target.value || null)}
            className={`${inputCls} w-56`}
          >
            <option value="">Nenhuma</option>
            {tags.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </Row>

        <Row
          title="Cadência ativa"
          description="Quando ligada, novos leads na etapa gatilho entram automaticamente."
        >
          <Toggle
            checked={form.enabled}
            disabled={!canEdit}
            onChange={(v) => set('enabled', v)}
          />
        </Row>

        <Row
          title="Permitir início manual"
          description="Deixa o atendente iniciar a cadência manualmente numa conversa."
        >
          <Toggle
            checked={form.allowManual}
            disabled={!canEdit}
            onChange={(v) => set('allowManual', v)}
          />
        </Row>
      </div>

      {/* Passos */}
      <div className="mt-6 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
            Passos da cadência
          </h3>
          <p className="mt-0.5 text-xs text-zinc-500">
            Cada passo é um toque. O rodapé de opções é anexado automaticamente ao texto.
          </p>
        </div>
        {canEdit && (
          <button
            type="button"
            onClick={addStep}
            className="inline-flex items-center gap-1 rounded-md border border-dashed border-zinc-300 px-2.5 py-1.5 text-xs font-medium text-zinc-500 hover:border-primary hover:text-primary dark:border-zinc-700"
          >
            <Plus className="h-3.5 w-3.5" /> Passo
          </button>
        )}
      </div>

      {loadingTemplates && (
        <p className="mt-2 text-xs text-zinc-400">Carregando templates aprovados…</p>
      )}

      <div className="mt-3 space-y-4">
        {form.steps.map((step, i) => {
          const footer = optionsFooter(step.options);
          return (
            <div
              key={i}
              className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                  <Repeat className="h-3 w-3" /> Toque {i + 1}
                </span>
                <div className="flex items-center gap-2">
                  <select
                    value={step.delayHours}
                    disabled={!canEdit}
                    onChange={(e) => setStep(i, 'delayHours', Number(e.target.value))}
                    className={`${inputCls} w-32`}
                  >
                    {DELAY_OPTIONS.map((d) => (
                      <option key={d.value} value={d.value}>
                        {d.label}
                      </option>
                    ))}
                    {!DELAY_OPTIONS.some((d) => d.value === step.delayHours) && (
                      <option value={step.delayHours}>{delayLabel(step.delayHours)}</option>
                    )}
                  </select>
                  {canEdit && form.steps.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeStep(i)}
                      className="rounded p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-red-500 dark:hover:bg-zinc-800"
                      title="Remover passo"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                    Mensagem
                  </label>
                  <span className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[11px] text-zinc-500 dark:bg-zinc-800">
                    {'{nome}'}
                  </span>
                </div>
                <textarea
                  value={step.content.text}
                  disabled={!canEdit}
                  onChange={(e) => setStep(i, 'content', { text: e.target.value })}
                  rows={3}
                  placeholder="Olá {nome}, ainda tem interesse na proposta?"
                  className={`${inputCls} mt-1.5 resize-y font-normal`}
                />
                {footer && (
                  <div className="mt-2 rounded-md border border-dashed border-zinc-300 bg-zinc-50 px-3 py-2 text-xs text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800/50">
                    <span className="font-medium text-zinc-400">Rodapé automático:</span>
                    <pre className="mt-1 whitespace-pre-wrap font-sans text-zinc-600 dark:text-zinc-300">
                      {footer}
                    </pre>
                  </div>
                )}
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-4">
                <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                  Opções:
                </span>
                {OPTION_ORDER.map((opt) => (
                  <label
                    key={opt}
                    className="inline-flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-300"
                  >
                    <input
                      type="checkbox"
                      checked={step.options.includes(opt)}
                      disabled={!canEdit}
                      onChange={() => toggleOption(i, opt)}
                      className="h-3.5 w-3.5 rounded border-zinc-300 text-primary focus:ring-primary disabled:opacity-60 dark:border-zinc-600"
                    />
                    {OPTION_LABEL[opt]}
                  </label>
                ))}
              </div>

              <div className="mt-3">
                <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                  Template HSM (fora da janela de 24h)
                </label>
                <select
                  value={step.templateId ?? ''}
                  disabled={!canEdit}
                  onChange={(e) => setStep(i, 'templateId', e.target.value || null)}
                  className={`${inputCls} mt-1.5 w-full`}
                >
                  <option value="">Nenhum</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.displayName || t.name}
                    </option>
                  ))}
                </select>
                {!loadingTemplates && templates.length === 0 && (
                  <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-500">
                    <AlertTriangle className="h-3 w-3 shrink-0" />
                    Nenhum template aprovado. Toques fora da janela de 24h não serão
                    entregues sem um template.
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Resumo + salvar */}
      <div className="mt-6 flex items-center justify-between gap-3">
        <p className="flex items-center gap-1.5 text-xs text-zinc-500">
          <TagIcon className="h-3.5 w-3.5" />
          Dispara em <strong className="font-medium text-zinc-700 dark:text-zinc-300">{triggerStageName}</strong>
          , {form.steps.length} {form.steps.length === 1 ? 'toque' : 'toques'}.
        </p>
        {canEdit && (
          <button
            type="button"
            onClick={doSave}
            disabled={!dirty || save.isPending}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Salvar cadência
          </button>
        )}
      </div>

      {canEdit && (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-zinc-400">
          <Info className="h-3.5 w-3.5" />
          As alterações valem para toda a organização.
        </p>
      )}
    </div>
  );
}
