import { cn } from '@/lib/utils';

export type FillStep = 'pick' | 'fill' | 'preview';

interface FillStepperProps {
  steps: readonly { id: FillStep; label: string }[];
  current: FillStep;
}

/** Trilha dos passos do preenchimento ("1 Modelo · 2 Campos · 3 Prévia"). */
export function FillStepper({ steps, current }: FillStepperProps) {
  const currentIndex = steps.findIndex((s) => s.id === current);
  return (
    <ol aria-label="Etapas" className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
      {steps.map((step, index) => {
        const isCurrent = index === currentIndex;
        const isDone = index < currentIndex;
        return (
          <li
            key={step.id}
            aria-current={isCurrent ? 'step' : undefined}
            className={cn(
              'inline-flex items-center gap-1.5',
              isCurrent ? 'font-semibold text-foreground' : 'text-muted-foreground',
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                'flex h-5 w-5 items-center justify-center rounded-full text-[11px] tabular-nums',
                isCurrent || isDone ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
              )}
            >
              {index + 1}
            </span>
            {step.label}
          </li>
        );
      })}
    </ol>
  );
}
