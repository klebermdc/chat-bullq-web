'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Building2, Plus, Pause, Play } from 'lucide-react';
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

  const toggleSuspend = async (id: string, suspended: boolean) => {
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
    <div className="mx-auto max-w-4xl p-6">
      <header className="mb-6 flex items-center gap-2">
        <Building2 className="h-5 w-5" />
        <h1 className="text-xl font-semibold">Plataforma — Empresas</h1>
      </header>

      <section className="mb-8 rounded-lg border p-4">
        <h2 className="mb-3 text-sm font-medium">Nova empresa</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input className="rounded border px-3 py-2 text-sm" placeholder="Nome da empresa"
            value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} />
          <input className="rounded border px-3 py-2 text-sm" placeholder="Plano (ex: free)"
            value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value })} />
          <input className="rounded border px-3 py-2 text-sm" placeholder="Nome do dono"
            value={form.ownerName} onChange={(e) => setForm({ ...form, ownerName: e.target.value })} />
          <input className="rounded border px-3 py-2 text-sm" placeholder="E-mail do dono" type="email"
            value={form.ownerEmail} onChange={(e) => setForm({ ...form, ownerEmail: e.target.value })} />
          <input className="rounded border px-3 py-2 text-sm" placeholder="Senha temporária (mín. 8)" type="text"
            value={form.ownerPassword} onChange={(e) => setForm({ ...form, ownerPassword: e.target.value })} />
        </div>
        <button onClick={handleCreate} disabled={saving}
          className="mt-3 inline-flex items-center gap-1 rounded bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50">
          <Plus className="h-4 w-4" /> {saving ? 'Criando…' : 'Criar empresa'}
        </button>
      </section>

      <section className="rounded-lg border">
        {isLoading ? (
          <div className="p-4 text-sm text-muted-foreground">Carregando…</div>
        ) : !orgs?.length ? (
          <div className="p-4 text-sm text-muted-foreground">Nenhuma empresa ainda.</div>
        ) : (
          <ul className="divide-y">
            {orgs.map((o) => (
              <li key={o.id} className="flex items-center justify-between p-4">
                <div>
                  <p className="text-sm font-medium">
                    {o.name}{' '}
                    {o.suspendedAt && <span className="ml-2 rounded bg-destructive/10 px-2 py-0.5 text-xs text-destructive">suspensa</span>}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {o.slug} · plano {o.plan} · {o._count.members} membros · {o._count.conversations} conversas
                  </p>
                </div>
                <button onClick={() => toggleSuspend(o.id, !!o.suspendedAt)}
                  className="inline-flex items-center gap-1 rounded border px-3 py-1.5 text-xs">
                  {o.suspendedAt ? <><Play className="h-3.5 w-3.5" /> Reativar</> : <><Pause className="h-3.5 w-3.5" /> Suspender</>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
