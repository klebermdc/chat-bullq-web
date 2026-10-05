'use client';

import { ChangeMyPasswordCard } from '@/features/settings/components/change-my-password';
import { NotificationPreferences } from '@/features/notifications/components/notification-preferences';

/**
 * Tela de autosserviço do usuário logado, fora de Configurações. Existe pra
 * qualquer cargo (inclusive Operador, que não vê /settings) conseguir mexer
 * nos próprios dados sem depender da permissão settings.view.
 */
export default function MinhaContaPage() {
  return (
    <div className="max-w-2xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Minha conta</h1>
        <p className="mt-1 text-sm text-muted-foreground">Notificações, som e senha.</p>
      </div>

      <section id="notificacoes">
        <NotificationPreferences />
      </section>

      <ChangeMyPasswordCard />
    </div>
  );
}
