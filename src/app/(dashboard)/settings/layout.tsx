'use client';

import { SettingsNav } from '@/features/settings/components/settings-nav';
import { usePermissions } from '@/lib/permissions';

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const { can } = usePermissions();
  // Todos os itens de Configurações compartilham a mesma feature — quem não
  // tem settings.view já é redirecionado pra /inbox pelo gate de rota do
  // DashboardLayout, isto aqui é defesa em profundidade.
  const canSeeSettings = can('settings.view');

  return (
    <div className="mx-auto h-full w-full max-w-6xl overflow-y-auto p-6">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Configurações</h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Gerencie sua organização e integrações
      </p>

      <div className="mt-6 flex flex-col gap-6 md:flex-row md:gap-8">
        {canSeeSettings && <SettingsNav />}
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
