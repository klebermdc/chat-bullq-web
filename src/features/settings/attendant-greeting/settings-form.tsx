'use client';

import { useEffect, useMemo, useState } from 'react';
import { MessageSquare, Info, Loader2, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/auth-store';
import { useAttendantGreetingSettings, useUpdateAttendantGreetingSettings } from './hooks';
import type { AttendantGreetingSettings } from './service';

const inputCls =
  'w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100';

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

export function AttendantGreetingSettingsForm() {
  const role = useAuthStore((s) => s.organizations.find((o) => o.id === s.activeOrgId)?.role ?? null);
  const canEdit = role === 'OWNER' || role === 'ADMIN';

  const { data, isLoading, isError, error } = useAttendantGreetingSettings();
  const update = useUpdateAttendantGreetingSettings();

  const [form, setForm] = useState<AttendantGreetingSettings | null>(null);

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  const dirty = useMemo(() => {
    if (!form || !data) return false;
    return JSON.stringify(form) !== JSON.stringify(data);
  }, [form, data]);

  if (isLoading || !form) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 2 }).map((_, i) => (
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

  const set = <K extends keyof AttendantGreetingSettings>(key: K, value: AttendantGreetingSettings[K]) =>
    setForm((f) => (f ? { ...f, [key]: value } : f));

  const save = () => {
    if (!form) return;
    update.mutate(
      { enabled: form.enabled, template: form.template },
      {
        onSuccess: () => toast.success('Saudação salva'),
        onError: (e) => toast.error(e instanceof Error ? e.message : 'Erro ao salvar'),
      },
    );
  };

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            <MessageSquare className="h-5 w-5 text-primary" />
            Saudação do atendente
          </h2>
          <p className="mt-0.5 text-sm text-zinc-500">
            Mensagem enviada automaticamente ao cliente quando um atendente assume o atendimento.
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
          title="Enviar saudação automática"
          description="Envia a mensagem abaixo ao cliente assim que um atendente assume a conversa."
        >
          <Toggle checked={form.enabled} disabled={!canEdit} onChange={(v) => set('enabled', v)} />
        </Row>

        <div className="py-4">
          <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Mensagem</p>
          <p className="mt-0.5 text-xs text-zinc-500">
            Use <code className="rounded bg-zinc-100 px-1 py-0.5 text-[11px] dark:bg-zinc-800">{'{atendente}'}</code> para
            inserir automaticamente o primeiro nome do atendente.
          </p>
          <textarea
            value={form.template}
            disabled={!canEdit}
            onChange={(e) => set('template', e.target.value)}
            rows={4}
            className={`${inputCls} mt-3 resize-y`}
            placeholder="Olá! Meu nome é {atendente} e vou continuar seu atendimento a partir de agora."
          />
        </div>
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
