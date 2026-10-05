import { AlertTriangle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDayFull } from '../lib/format';

/**
 * A resposta em uma frase à pergunta do dono: "a Meta já está me cobrando
 * pelo atendimento?". Sai do primeiro dia em que a Meta marcou uma mensagem
 * de atendimento como cobrável.
 */
export function StatusBanner({ firstBillableServiceDate }: { firstBillableServiceDate: string | null }) {
  const isCharging = firstBillableServiceDate !== null;
  const Icon = isCharging ? AlertTriangle : Info;

  return (
    <p
      role="status"
      className={cn(
        'flex items-start gap-2.5 rounded-xl border border-border px-4 py-3 text-sm',
        isCharging ? 'bg-warning-wash text-warning-ink' : 'bg-muted text-foreground',
      )}
    >
      <Icon aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
      <span className="min-w-0">
        {isCharging
          ? `A Meta começou a cobrar mensagens de atendimento em ${formatDayFull(firstBillableServiceDate)}.`
          : 'A Meta ainda não cobrou nenhuma mensagem de atendimento desta conta. A cobrança foi anunciada para 01/10/2026.'}
      </span>
    </p>
  );
}
