'use client';

import { ChangeMyPasswordCard } from '@/features/settings/components/change-my-password';

/**
 * Tela de autosserviço do usuário logado, fora de Configurações. Existe pra
 * qualquer cargo (inclusive Operador, que não vê /settings) conseguir mexer
 * nos próprios dados sem depender da permissão settings.view.
 */
export default function MinhaContaPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4">
      <div>
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Minha conta</h1>
        <p className="mt-0.5 text-sm text-zinc-500">Gerencie suas preferências pessoais</p>
      </div>

      <ChangeMyPasswordCard />
    </div>
  );
}
