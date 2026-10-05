'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Building2, Plus, Pause, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { controlCls } from '@/components/ui/control';
import { usePageTitle } from '@/components/layout/use-page-title';
import { EmptyState, LoadingState } from '@/components/ui/empty-state';
import { platformService, type CreateOrgPayload } from '@/features/platform/services/platform.service';

const EMPTY: CreateOrgPayload = {
  companyName: '', plan: 'free', ownerName: '', ownerEmail: '', ownerPassword: '',
};

export default function PlatformPage() {
  const queryClient = useQueryClient();
  const { data: orgs, isLoading } = useQuery({
    queryKey: ['platform', 'organizations'],
    queryFn: () => platformService.list(),
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['platform', 'organizations'] });

  const [form, setForm] = useState<CreateOrgPayload>(EMPTY);
  const [saving, setSaving] = useState(false);
  const { confirm, confirmDialog } = useConfirm();
  usePageTitle('Plataforma — Empresas');

  const handleCreate = async () => {
    if (!form.companyName.trim() || !form.ownerEmail.trim() || form.ownerPassword.length < 8) {
      toast.error('Preencha empresa, e-mail do dono e senha (mín. 8).');
      return;
    }
    setSaving(true);
    try {
      const res = await platformService.create(form);
      toast.success(`Empresa "${res.organization.name}" criada.`);
      setForm(EMPTY);
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha ao criar empresa');
    } finally {
      setSaving(false);
    }
  };

  const toggleSuspend = async (id: string, name: string, suspended: boolean) => {
    // Suspender derruba a empresa inteira: confirma antes, com o nome dela.
    // Reativar não precisa — só devolve o acesso.
    if (!suspended) {
      const isConfirmed = await confirm({
        title: `Suspender a empresa "${name}"?`,
        description:
          'Todos os membros perdem o acesso e o atendimento da empresa para até ela ser reativada.',
        confirmLabel: 'Suspender empresa',
        destructive: true,
      });
      if (!isConfirmed) return;
    }
    try {
      if (suspended) await platformService.activate(id);
      else await platformService.suspend(id);
      refresh();
      toast.success(suspended ? 'Empresa reativada.' : 'Empresa suspensa.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha na ação');
    }
  };

  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-6">
      <header className="mb-6 flex items-center gap-2">
        <Building2 aria-hidden="true" className="h-5 w-5 text-muted-foreground" />
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Plataforma — Empresas</h1>
      </header>

      <section className="mb-8 rounded-xl border border-border bg-card p-4 shadow-soft">
        <h2 className="mb-3 text-lg font-semibold text-foreground">Nova empresa</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input className={`${controlCls} w-full`} placeholder="Nome da empresa" aria-label="Nome da empresa"
            value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} />
          <input className={`${controlCls} w-full`} placeholder="Plano (ex.: free)" aria-label="Plano"
            value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value })} />
          <input className={`${controlCls} w-full`} placeholder="Nome do dono" aria-label="Nome do dono"
            value={form.ownerName} onChange={(e) => setForm({ ...form, ownerName: e.target.value })} />
          <input className={`${controlCls} w-full`} placeholder="E-mail do dono" aria-label="E-mail do dono" type="email"
            value={form.ownerEmail} onChange={(e) => setForm({ ...form, ownerEmail: e.target.value })} />
          <input className={`${controlCls} w-full`} placeholder="Senha temporária (mín. 8)" aria-label="Senha temporária" type="text"
            value={form.ownerPassword} onChange={(e) => setForm({ ...form, ownerPassword: e.target.value })} />
        </div>
        <Button onClick={handleCreate} loading={saving} className="mt-3">
          {!saving && <Plus aria-hidden="true" className="h-4 w-4" />} {saving ? 'Criando…' : 'Criar empresa'}
        </Button>
      </section>

      <section className="rounded-xl border border-border bg-card shadow-soft">
        {isLoading ? (
          <LoadingState />
        ) : !orgs?.length ? (
          <EmptyState
            size="sm"
            icon={Building2}
            title="Nenhuma empresa ainda"
            description="Crie a primeira no formulário acima."
          />
        ) : (
          <ul className="divide-y divide-border">
            {orgs.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-foreground">
                    {o.name}
                    {o.suspendedAt && (
                      <span className="rounded-full bg-urgent-wash px-2 py-0.5 text-[11px] font-medium text-urgent-ink">
                        Suspensa
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {o.slug} · plano {o.plan} ·{' '}
                    <span className="tabular-nums">{o._count.members}</span>{' '}
                    {o._count.members === 1 ? 'membro' : 'membros'} ·{' '}
                    <span className="tabular-nums">{o._count.conversations}</span>{' '}
                    {o._count.conversations === 1 ? 'conversa' : 'conversas'}
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => toggleSuspend(o.id, o.name, !!o.suspendedAt)}>
                  {o.suspendedAt ? (
                    <><Play aria-hidden="true" className="h-3.5 w-3.5" /> Reativar</>
                  ) : (
                    <><Pause aria-hidden="true" className="h-3.5 w-3.5" /> Suspender</>
                  )}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {confirmDialog}
    </div>
  );
}
