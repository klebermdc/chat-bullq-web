'use client';

import { TriangleAlert } from 'lucide-react';
import { controlCls } from '@/components/ui/control';
import { REVIEW_TEXT_MAX } from '../lib/proposal-review';

interface Props {
  text: string;
  disabled: boolean;
  onTextChange: (value: string) => void;
}

/**
 * Conferência da proposta lida do print. A leitura é feita por um modelo e já
 * errou feio (inventou diárias, datas e até um transfer): por isso nada vai ao
 * cliente antes de o atendente comparar com a imagem. A mensagem inteira fica
 * aberta para edição e é exatamente ela que o cliente recebe.
 */
export function ProposalReviewPanel({ text, disabled, onTextChange }: Props) {
  return (
    <section
      aria-labelledby="proposal-review-title"
      className="rounded-lg border border-border bg-warning-wash px-3 py-3"
    >
      <h3
        id="proposal-review-title"
        className="flex items-center gap-1.5 text-sm font-semibold text-warning-ink"
      >
        <TriangleAlert aria-hidden="true" className="h-4 w-4 shrink-0" />
        Confira antes de enviar
      </h3>
      <p className="mt-1 text-xs text-warning-ink">
        Foi isto que eu li do print. Compare com a imagem e corrija o que precisar: é este texto
        que o cliente recebe. Nada foi enviado ainda.
      </p>

      <label htmlFor="proposal-review-text" className="mt-3 block text-xs font-medium text-foreground">
        Mensagem para o cliente
      </label>
      <textarea
        id="proposal-review-text"
        value={text}
        onChange={(e) => onTextChange(e.target.value)}
        disabled={disabled}
        rows={10}
        maxLength={REVIEW_TEXT_MAX}
        className={`${controlCls} mt-1 h-auto w-full resize-y py-2`}
      />
      <p className="mt-1 text-xs text-muted-foreground">
        Os prints vão logo depois desta mensagem.
      </p>
    </section>
  );
}
