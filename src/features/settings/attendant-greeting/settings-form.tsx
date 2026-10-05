'use client';

import { useEffect, useMemo, useState } from 'react';
import { Info, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { controlCls } from '@/components/ui/control';
import { Switch } from '@/components/ui/switch';
import { SettingsPageHeader } from '@/features/settings/components/settings-page-header';
import { useAttendantGreetingSettings, useUpdateAttendantGreetingSettings } from './hooks';
import type { AttendantGreetingSettings } from './service';

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
        <p className="text-sm font-medium text-foreground">{title}</p>
        {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
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
          <div key={i} className="h-14 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div role="alert" className="rounded-lg bg-urgent-wash px-4 py-3 text-sm text-urgent-ink">
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
      <SettingsPageHeader
        title="Saudação do atendente"
        description="Mensagem enviada automaticamente ao cliente quando um atendente assume o atendimento."
      />

      {!canEdit && (
        <div className="mt-4 flex items-center gap-2 rounded-lg bg-muted px-4 py-2.5 text-xs text-muted-foreground">
          <Lock aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
          Apenas donos e administradores podem alterar estas configurações.
        </div>
      )}

      <div className="mt-6 divide-y divide-border rounded-xl border border-border bg-card px-5 shadow-soft">
        <Row
          title="Enviar saudação automática"
          description="Envia a mensagem abaixo ao cliente assim que um atendente assume a conversa."
        >
          <Switch
            checked={form.enabled}
            disabled={!canEdit}
            onChange={(v) => set('enabled', v)}
            label="Enviar saudação automática"
          />
        </Row>

        <div className="py-4">
          <label htmlFor="greeting-template" className="text-sm font-medium text-foreground">
            Mensagem
          </label>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Use <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">{'{atendente}'}</code> para
            inserir automaticamente o primeiro nome do atendente.
          </p>
          <textarea
            id="greeting-template"
            value={form.template}
            disabled={!canEdit}
            onChange={(e) => set('template', e.target.value)}
            rows={4}
            className={`${controlCls} mt-3 h-auto w-full resize-y py-2`}
            placeholder="Olá! Meu nome é {atendente} e vou continuar seu atendimento a partir de agora."
          />
        </div>
      </div>

      {canEdit && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Info aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
            As alterações valem para toda a organização.
          </p>
          <Button type="button" onClick={save} disabled={!dirty} loading={update.isPending}>
            Salvar alterações
          </Button>
        </div>
      )}
    </div>
  );
}
