'use client';

import { useQuery } from '@tanstack/react-query';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LoadingState } from '@/components/ui/empty-state';
import { getErrorMessage } from '@/lib/errors';
import { placeholderLabel, splitByPlaceholders } from '../lib/placeholders';
import { documentTemplatesService } from '../services/document-templates.service';
import type { PlaceholderValues } from '../types';

interface RenderedPreviewProps {
  templateId: string;
  values: PlaceholderValues;
  /** Volta para os campos (link "Preencher" na lista de pendências). */
  onEditFields: () => void;
}

/**
 * Prévia do documento como a API vai gerar, com os campos ainda vazios
 * destacados no texto e listados acima dele.
 */
export function RenderedPreview({ templateId, values, onEditFields }: RenderedPreviewProps) {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['document-render', templateId, values],
    queryFn: () => documentTemplatesService.render(templateId, values),
    gcTime: 0,
  });

  if (isLoading) return <LoadingState label="Montando a prévia…" />;

  if (isError || !data) {
    return (
      <div role="alert" className="space-y-3 rounded-xl border border-border px-4 py-6 text-center text-sm">
        <p className="text-foreground">{getErrorMessage(error, 'Não foi possível montar a prévia.')}</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          Tentar de novo
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {data.missing.length > 0 && (
        <div role="alert" className="rounded-xl bg-warning-wash px-4 py-3 text-sm text-warning-ink">
          <p className="flex items-center gap-2 font-medium">
            <AlertTriangle aria-hidden="true" className="h-4 w-4 shrink-0" />
            {data.missing.length === 1 ? 'Falta preencher 1 campo' : `Faltam preencher ${data.missing.length} campos`}
          </p>
          <p className="mt-1 pl-6">{data.missing.map(placeholderLabel).join(', ')}</p>
          <button
            type="button"
            onClick={onEditFields}
            className="mt-2 ml-6 rounded font-semibold underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Preencher agora
          </button>
        </div>
      )}

      <article
        aria-label="Prévia do documento"
        tabIndex={0}
        className="max-h-[50vh] overflow-y-auto whitespace-pre-wrap break-words rounded-xl border border-border bg-background px-4 py-4 text-sm leading-relaxed text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {splitByPlaceholders(data.text, data.missing).map((segment, i) =>
          segment.isPlaceholder ? (
            <mark key={i} className="rounded bg-warning-wash px-0.5 font-medium text-warning-ink">
              {segment.text}
            </mark>
          ) : (
            <span key={i}>{segment.text}</span>
          ),
        )}
      </article>
    </div>
  );
}
