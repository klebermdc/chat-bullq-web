'use client';

import { Repeat, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  useActiveEnrollment,
  useCadences,
  useStartCadence,
} from '../hooks/use-cadences';
import { getErrorMessage } from '@/lib/errors';

interface Props {
  conversationId: string;
  /** Fecha o popover do menu ⋯ depois de disparar. */
  onDone: () => void;
}

/**
 * Linha "Colocar em cadência" do menu ⋯ do header.
 *
 * Só aparece quando NÃO há enrollment vivo — com cadência rodando (ou pausada)
 * quem manda é o `CadenceBadge`. Serve pro caso de a cadência já ter encerrado
 * (handoff, esgotada, cliente disse não) e o atendente querer devolver o lead
 * pro follow-up automático sem ter que arrastar o card pra fora da etapa e de
 * volta.
 *
 * Fica no menu, não na barra: o header passou por um declutter e ganhar mais um
 * botão fixo ali desfaria aquele trabalho.
 */
export function CadenceStartMenuItem({ conversationId, onDone }: Props) {
  const { data: enrollment } = useActiveEnrollment(conversationId);
  const { data: cadences } = useCadences();
  const start = useStartCadence(conversationId);

  // Cadência viva (ACTIVE ou PAUSED) → o selo já cobre; nada a oferecer aqui.
  if (enrollment?.active) return null;

  const startable = (cadences ?? []).filter(
    (c) => c.id && c.enabled && c.allowManual && c.steps.length > 0,
  );
  if (startable.length === 0) return null;

  const handleStart = (cadenceId: string, name: string) => {
    start.mutate(cadenceId, {
      onSuccess: () => {
        toast.success(`Cliente de volta na cadência "${name}"`);
        onDone();
      },
      onError: (err: any) =>
        toast.error(
          getErrorMessage(err, 'Erro ao colocar em cadência'),
        ),
    });
  };

  return (
    <>
      <div className="my-1 h-px bg-muted" />
      <div className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        Cadência
      </div>
      {startable.map((c) => (
        <button
          key={c.id}
          type="button"
          onClick={() => handleStart(c.id!, c.name)}
          disabled={start.isPending}
          title={`Reinicia o follow-up automático "${c.name}" do passo 1`}
          className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm text-foreground hover:bg-muted/50 disabled:opacity-50"
        >
          {start.isPending ? (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
          ) : (
            <Repeat className="h-4 w-4 shrink-0 text-muted-foreground" />
          )}
          <span className="truncate">
            {startable.length === 1 ? 'Colocar em cadência' : c.name}
          </span>
        </button>
      ))}
    </>
  );
}
