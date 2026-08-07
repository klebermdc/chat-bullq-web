'use client';

import { useEffect, useState } from 'react';
import { Building2, Info, Loader2, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/auth-store';
import {
  useOrganizationGeneralSettings,
  useUpdateOrganizationGeneralSettings,
} from './hooks';
import { normalizeCancellationPolicy } from './service';

const inputCls =
  'w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100';

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
            className="h-14 animate-pulse rounded-lg border bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900"
          />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-400">
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
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            <Building2 className="h-5 w-5 text-primary" />
            Política de cancelamento
          </h2>
          <p className="mt-0.5 text-sm text-zinc-500">
            Aparece para o cliente no Aceite de Entrega, logo antes de ele
            assinar. Deixe em branco para não exibir nenhuma política.
          </p>
        </div>
      </div>

      {!canEdit && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
          <Lock className="h-3.5 w-3.5 shrink-0" />
          Apenas donos e administradores podem alterar estas configurações.
        </div>
      )}

      <div className="mt-4 rounded-xl border border-zinc-200 bg-white px-5 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="py-4">
          <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Texto da política
          </p>
          <p className="mt-0.5 text-xs text-zinc-500">
            O cliente lê isso no celular. As quebras de linha são preservadas —
            use parágrafos curtos.
          </p>
          <textarea
            value={policy}
            disabled={!canEdit}
            onChange={(e) => setPolicy(e.target.value)}
            rows={10}
            // Mesmo teto do @MaxLength do DTO na API: barrar aqui evita o dono
            // escrever demais e só descobrir o limite no 400 depois de salvar.
            maxLength={POLICY_MAX_LENGTH}
            className={`${inputCls} mt-3 resize-y`}
            placeholder={
              'Ex.:\nCancelamentos com mais de 7 dias de antecedência: reembolso integral.\nEntre 3 e 7 dias: reembolso de 50%.\nCom menos de 3 dias: sem reembolso.'
            }
          />
          <p className="mt-1.5 text-right text-xs text-zinc-400">
            {policy.trim().length} / {POLICY_MAX_LENGTH} caracteres
          </p>
        </div>
      </div>

      {canEdit && (
        <div className="mt-5 flex items-center justify-between gap-3">
          <p className="flex items-center gap-1.5 text-xs text-zinc-400">
            <Info className="h-3.5 w-3.5" />
            Vale para os próximos aceites. Os já enviados mantêm a política da
            época.
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
