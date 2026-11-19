'use client';

import { Clock } from 'lucide-react';
import { useIdleLogout } from '@/hooks/use-idle-logout';

/** Liga o logout por inatividade e avisa no último minuto. */
export function IdleLogoutBanner() {
  const secondsLeft = useIdleLogout();
  if (secondsLeft === null) return null;

  return (
    <div
      role="alert"
      className="flex items-center gap-2 border-b border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100"
    >
      <Clock className="size-4 shrink-0" aria-hidden />
      <span>
        Sem uso há quase 15 minutos: você sai do sistema em <strong>{secondsLeft}s</strong>.
        Mexa o mouse ou aperte uma tecla para continuar.
      </span>
    </div>
  );
}
