import { ThumbsDown } from 'lucide-react';
import { lostReasonLabel } from '@/features/pipelines/lib/lost-reasons';

interface Props {
  reason: string;
  note?: string | null;
  lostAt?: string | null;
}

/**
 * Faixa acima do campo de mensagem quando a conversa foi dada como venda
 * perdida. Continua visível se o cliente voltar a escrever: quem pegar o
 * atendimento já sabe o que aconteceu da última vez.
 */
export function LostSaleBanner({ reason, note, lostAt }: Props) {
  const date = lostAt
    ? new Date(lostAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
    : null;
  return (
    <div className="flex items-start gap-2 border-t border-border bg-urgent-wash px-4 py-2 text-sm text-urgent-ink">
      <ThumbsDown aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
      <p className="min-w-0">
        <span className="font-semibold">
          Venda perdida{date ? ` em ${date}` : ''}: {lostReasonLabel(reason)}
        </span>
        {note && <span className="text-urgent-ink/80"> · {note}</span>}
      </p>
    </div>
  );
}
