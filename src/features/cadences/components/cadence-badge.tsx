'use client';

import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import { Repeat, Loader2, PauseCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useActiveEnrollment, useStopEnrollment } from '../hooks/use-cadences';

interface Props {
  conversationId: string;
}

/**
 * Indicador "🔁 Em cadência · passo N/M" + popover pra pausar/assumir a
 * conversa. Auto-oculta (renderiza `null`) quando não há enrollment ativo,
 * então o header pode montá-lo incondicionalmente. Reusa o primitivo de
 * Popover do headless-ui (mesmo de scheduled-messages-popover / assignment).
 */
export function CadenceBadge({ conversationId }: Props) {
  const { data } = useActiveEnrollment(conversationId);
  const stop = useStopEnrollment(conversationId);

  if (!data?.active || !data.enrollmentId) return null;

  const { enrollmentId, currentStep, totalSteps, cadenceName } = data;
  const stepLabel =
    currentStep != null && totalSteps != null
      ? `passo ${currentStep}/${totalSteps}`
      : 'ativa';

  const handleStop = (close: () => void) => {
    stop.mutate(enrollmentId, {
      onSuccess: () => {
        toast.success('Cadência pausada — você assumiu a conversa');
        close();
      },
      onError: (err: any) =>
        toast.error(err?.response?.data?.message || 'Erro ao pausar cadência'),
    });
  };

  return (
    <Popover className="relative">
      <PopoverButton
        title={cadenceName ? `Em cadência: ${cadenceName}` : 'Em cadência'}
        className="inline-flex h-8 items-center gap-1 rounded-md bg-violet-500/10 px-2 text-xs font-semibold text-violet-600 hover:bg-violet-500/15 dark:text-violet-400"
      >
        <Repeat className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Em cadência · </span>
        {stepLabel}
      </PopoverButton>

      <PopoverPanel
        anchor="bottom end"
        transition
        className="z-50 mt-1.5 w-72 rounded-lg border border-zinc-200 bg-white p-1 shadow-lg outline-none transition duration-100 ease-out data-[closed]:scale-95 data-[closed]:opacity-0 dark:border-zinc-800 dark:bg-zinc-900 [--anchor-gap:0.25rem]"
      >
        {({ close }) => (
          <>
            <div className="px-2 py-1.5 text-[11px] font-bold uppercase tracking-wide text-zinc-400">
              Cadência
            </div>
            <div className="px-2 pb-2">
              <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                {cadenceName || 'Cadência ativa'}
              </p>
              {currentStep != null && totalSteps != null && (
                <p className="mt-0.5 flex items-center gap-1 text-xs text-zinc-500">
                  <Repeat className="h-3 w-3" />
                  Passo {currentStep} de {totalSteps}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => handleStop(close)}
              disabled={stop.isPending}
              className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm font-medium text-zinc-700 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:text-zinc-200 dark:hover:bg-red-900/20 dark:hover:text-red-400"
            >
              {stop.isPending ? (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
              ) : (
                <PauseCircle className="h-4 w-4 shrink-0" />
              )}
              Pausar / Assumir conversa
            </button>
          </>
        )}
      </PopoverPanel>
    </Popover>
  );
}
