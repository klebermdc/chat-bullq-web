'use client';

import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import { Repeat, Loader2, PauseCircle, Play } from 'lucide-react';
import { toast } from 'sonner';
import {
  useActiveEnrollment,
  useStopEnrollment,
  useResumeEnrollment,
} from '../hooks/use-cadences';
import { getErrorMessage } from '@/lib/errors';

interface Props {
  conversationId: string;
}

/** "hoje às 15:20" / "23/07 às 08:00" — mesmo idioma do popover de agendadas. */
function formatResume(iso: string): string {
  const d = new Date(iso);
  const hoje = new Date().toDateString() === d.toDateString();
  const hora = d.toLocaleString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  if (hoje) return `hoje às ${hora}`;
  const dia = d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit' });
  return `${dia} às ${hora}`;
}

/**
 * Indicador da cadência no header + popover de ações.
 *
 * Dois estados vivos:
 * - ACTIVE  → "🔁 Em cadência · passo N/M", ação = pausar/assumir.
 * - PAUSED  → "⏸ Cadência pausada", ação = retomar agora (ou encerrar).
 *
 * PAUSED é o estado do revive: o cliente deu uma resposta fraca ("vou pensar",
 * "tô cotando"), a cadência pausou e o watchdog de silêncio vai retomar sozinho.
 * Mostrar esse estado é o ponto — antes o selo sumia e o atendente concluía que
 * a cadência tinha morrido.
 *
 * Auto-oculta (renderiza `null`) quando não há enrollment vivo, então o header
 * pode montá-lo incondicionalmente. Reusa o primitivo de Popover do headless-ui
 * (mesmo de scheduled-messages-popover / assignment).
 */
export function CadenceBadge({ conversationId }: Props) {
  const { data } = useActiveEnrollment(conversationId);
  const stop = useStopEnrollment(conversationId);
  const resume = useResumeEnrollment(conversationId);

  if (!data?.active || !data.enrollmentId) return null;

  const { enrollmentId, currentStep, totalSteps, cadenceName, paused, resumesAt } =
    data;
  const stepLabel =
    currentStep != null && totalSteps != null
      ? `passo ${currentStep}/${totalSteps}`
      : 'ativa';

  const handleStop = (close: () => void) => {
    stop.mutate(enrollmentId, {
      onSuccess: () => {
        toast.success('Cadência encerrada — você assumiu a conversa');
        close();
      },
      onError: (err: any) =>
        toast.error(getErrorMessage(err, 'Erro ao encerrar cadência')),
    });
  };

  const handleResume = (close: () => void) => {
    resume.mutate(enrollmentId, {
      onSuccess: () => {
        toast.success('Cadência retomada — o próximo toque já está agendado');
        close();
      },
      onError: (err: any) =>
        toast.error(getErrorMessage(err, 'Erro ao retomar cadência')),
    });
  };

  const busy = stop.isPending || resume.isPending;

  return (
    <Popover className="relative">
      <PopoverButton
        title={
          paused
            ? `Cadência pausada${cadenceName ? `: ${cadenceName}` : ''} — retoma sozinha após o silêncio`
            : cadenceName
              ? `Em cadência: ${cadenceName}`
              : 'Em cadência'
        }
        className={
          paused
            ? 'inline-flex h-8 items-center gap-1 whitespace-nowrap rounded-lg bg-warning-wash px-2 text-xs font-semibold text-warning-ink hover:bg-warning/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
            : 'inline-flex h-8 items-center gap-1 whitespace-nowrap rounded-lg bg-primary/10 px-2 text-xs font-semibold text-primary hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
        }
      >
        {paused ? (
          <PauseCircle className="h-3.5 w-3.5" />
        ) : (
          <Repeat className="h-3.5 w-3.5" />
        )}
        {paused ? (
          <>
            <span className="hidden sm:inline">Cadência </span>pausada
          </>
        ) : (
          <>
            <span className="hidden sm:inline">Em cadência · </span>
            {stepLabel}
          </>
        )}
      </PopoverButton>

      <PopoverPanel
        anchor="bottom end"
        transition
        className="z-50 mt-1.5 w-72 rounded-lg border border-border bg-card p-1 shadow-elevated outline-none transition duration-100 ease-out data-[closed]:scale-95 data-[closed]:opacity-0 [--anchor-gap:0.25rem]"
      >
        {({ close }) => (
          <>
            <div className="px-2 py-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              Cadência
            </div>
            <div className="px-2 pb-2">
              <p className="truncate text-sm font-medium text-foreground">
                {cadenceName || 'Cadência ativa'}
              </p>
              {currentStep != null && totalSteps != null && (
                <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                  <Repeat className="h-3 w-3" />
                  Passo {currentStep} de {totalSteps}
                </p>
              )}
              {paused && (
                <p className="mt-1.5 text-xs leading-relaxed text-warning-ink">
                  Pausada porque o cliente respondeu sem fechar.
                  {resumesAt
                    ? ` Retoma sozinha ${formatResume(resumesAt)} se a conversa ficar em silêncio.`
                    : ' Retoma sozinha após o período de silêncio.'}
                </p>
              )}
            </div>

            {paused && (
              <button
                type="button"
                onClick={() => handleResume(close)}
                disabled={busy}
                className="flex w-full items-center gap-2 rounded-md bg-primary/5 px-2 py-2 text-left text-sm font-medium text-primary hover:bg-primary/10 disabled:opacity-50 dark:bg-primary/10 dark:hover:bg-primary/20"
              >
                {resume.isPending ? (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                ) : (
                  <Play aria-hidden="true" className="h-4 w-4 shrink-0" />
                )}
                Retomar agora
              </button>
            )}

            <button
              type="button"
              onClick={() => handleStop(close)}
              disabled={busy}
              className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm font-medium text-foreground hover:bg-urgent-wash hover:text-urgent-ink disabled:opacity-50"
            >
              {stop.isPending ? (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
              ) : (
                <PauseCircle className="h-4 w-4 shrink-0" />
              )}
              {paused ? 'Encerrar cadência' : 'Pausar / Assumir conversa'}
            </button>
          </>
        )}
      </PopoverPanel>
    </Popover>
  );
}
