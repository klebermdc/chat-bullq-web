'use client';

import { useEffect, useState } from 'react';
import { Info, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { controlCls } from '@/components/ui/control';
import { SettingsPageHeader } from '@/features/settings/components/settings-page-header';
import {
  useOrganizationGeneralSettings,
  useUpdateOrganizationGeneralSettings,
} from './hooks';
import { normalizeCancellationPolicy } from './service';

/** Espelha o `@MaxLength(5000)` de `cancellationPolicy` no UpdateOrganizationDto. */
const POLICY_MAX_LENGTH = 5000;

export function CancellationPolicyForm() {
  const role = useAuthStore(
    (s) => s.organizations.find((o) => o.id === s.activeOrgId)?.role ?? null,
  );
  // Mesmo gate do endpoint (`@Roles(OWNER, ADMIN)` em PATCH /organizations/current):
  // travar o campo aqui evita o atendente escrever a política inteira e só
  // descobrir no 403.
  const canEdit = role === 'OWNER' || role === 'ADMIN';

  const { data, isLoading, isError, error } = useOrganizationGeneralSettings();
  const update = useUpdateOrganizationGeneralSettings();

  // `''` (e não null) porque o textarea é controlado e precisa de string sempre.
  const [policy, setPolicy] = useState('');

  useEffect(() => {
    if (data) setPolicy(data.cancellationPolicy ?? '');
  }, [data]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            className="h-14 animate-pulse rounded-xl bg-muted"
          />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div role="alert" className="rounded-lg bg-urgent-wash px-4 py-3 text-sm text-urgent-ink">
        {error instanceof Error
          ? error.message
          : 'Erro ao carregar as configurações'}
      </div>
    );
  }

  const normalized = normalizeCancellationPolicy(policy);
  // Compara já normalizado: só espaço a mais no fim não é uma alteração real e
  // não deve habilitar o botão de salvar.
  const dirty = normalized !== (data?.cancellationPolicy ?? null);

  const save = () => {
    update.mutate(
      { cancellationPolicy: normalized },
      {
        onSuccess: () => toast.success('Política de cancelamento salva'),
        onError: (e) =>
          toast.error(e instanceof Error ? e.message : 'Erro ao salvar'),
      },
    );
  };

  return (
    <div>
      <SettingsPageHeader
        title="Política de cancelamento"
        description="Aparece para o cliente no Aceite de Entrega, logo antes de ele assinar. Deixe em branco para não exibir nenhuma política."
      />

      {!canEdit && (
        <div className="mt-4 flex items-center gap-2 rounded-lg bg-muted px-4 py-2.5 text-xs text-muted-foreground">
          <Lock aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
          Apenas donos e administradores podem alterar estas configurações.
        </div>
      )}

      <div className="mt-6 rounded-xl border border-border bg-card p-5 shadow-soft">
        <div>
          <label htmlFor="cancellation-policy" className="text-sm font-medium text-foreground">
            Texto da política
          </label>
          <p className="mt-0.5 text-xs text-muted-foreground">
            O cliente lê isso no celular. As quebras de linha são preservadas —
            use parágrafos curtos.
          </p>
          <textarea
            id="cancellation-policy"
            value={policy}
            disabled={!canEdit}
            onChange={(e) => setPolicy(e.target.value)}
            rows={10}
            // Mesmo teto do @MaxLength do DTO na API: barrar aqui evita o dono
            // escrever demais e só descobrir o limite no 400 depois de salvar.
            maxLength={POLICY_MAX_LENGTH}
            className={`${controlCls} mt-3 h-auto w-full resize-y py-2`}
            placeholder={
              'Ex.:\nCancelamentos com mais de 7 dias de antecedência: reembolso integral.\nEntre 3 e 7 dias: reembolso de 50%.\nCom menos de 3 dias: sem reembolso.'
            }
          />
          {/*
            Conta a string CRUA, igual ao `maxLength` — com `.trim()` aqui, um
            texto no limite com espaços no fim travava de digitar enquanto o
            contador ainda mostrava folga, e o dono não entendia o porquê.
          */}
          <p className="mt-1.5 text-right text-xs text-muted-foreground">
            <span className="font-mono tabular-nums">{policy.length} / {POLICY_MAX_LENGTH}</span> caracteres
          </p>
        </div>
      </div>

      {canEdit && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Info aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
            Vale para os próximos aceites. Os já enviados mantêm a política da
            época.
          </p>
          <Button type="button" onClick={save} disabled={!dirty} loading={update.isPending}>
            Salvar alterações
          </Button>
        </div>
      )}
    </div>
  );
}
