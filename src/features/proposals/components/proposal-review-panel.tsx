'use client';

import { TriangleAlert } from 'lucide-react';
import { controlCls } from '@/components/ui/control';
import { REVIEW_LINE_MAX, REVIEW_MAX_LINES, REVIEW_TITLE_MAX } from '../lib/proposal-review';
import type { ProposalPreview } from '../types';

interface Props {
  preview: ProposalPreview;
  title: string;
  linesText: string;
  disabled: boolean;
  onTitleChange: (value: string) => void;
  onLinesChange: (value: string) => void;
}

/**
 * Conferência da proposta lida do print. A leitura é feita por um modelo e já
 * errou feio (inventou diárias, datas e até um transfer): por isso nada vai ao
 * cliente antes de o atendente comparar com a imagem. Produto que não é
 * ingresso pode ser corrigido aqui mesmo; ingresso aparece como será enviado.
 */
export function ProposalReviewPanel({
  preview,
  title,
  linesText,
  disabled,
  onTitleChange,
  onLinesChange,
}: Props) {
  const isOther = preview.proposal.kind === 'OTHER';
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
        Foi isto que eu li do print. Compare com a imagem
        {isOther ? ' e corrija o que estiver errado' : ''}: é este texto que o cliente recebe.
        Nada foi enviado ainda.
      </p>

      {isOther ? (
        <div className="mt-3 space-y-3">
          <div>
            <label htmlFor="proposal-review-product" className="block text-xs font-medium text-foreground">
              Produto
            </label>
            <input
              id="proposal-review-product"
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              disabled={disabled}
              maxLength={REVIEW_TITLE_MAX}
              className={`${controlCls} mt-1 w-full`}
            />
          </div>
          <div>
            <label htmlFor="proposal-review-lines" className="block text-xs font-medium text-foreground">
              Condições (uma por linha)
            </label>
            <textarea
              id="proposal-review-lines"
              value={linesText}
              onChange={(e) => onLinesChange(e.target.value)}
              disabled={disabled}
              rows={6}
              className={`${controlCls} mt-1 h-auto w-full resize-y py-2`}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Até {REVIEW_MAX_LINES} linhas de {REVIEW_LINE_MAX} caracteres. A saudação e os prints
              vão junto.
            </p>
          </div>
        </div>
      ) : (
        <>
          <pre className="mt-3 max-h-56 overflow-y-auto whitespace-pre-wrap rounded-lg bg-card px-3 py-2 font-sans text-xs text-foreground">
            {preview.text}
          </pre>
          <p className="mt-1 text-xs text-muted-foreground">
            Não confere? Escreva o certo no resumo acima e leia os prints de novo.
          </p>
        </>
      )}
    </section>
  );
}
