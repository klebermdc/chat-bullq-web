'use client';

import { Loader2 } from 'lucide-react';
import { LoadingState } from '@/components/ui/empty-state';
import { getErrorMessage } from '@/lib/errors';
import type { useTemplateFill } from '../hooks/use-template-fill';
import { PlaceholderForm } from './placeholder-form';

interface TemplateFillFieldsProps {
  fill: ReturnType<typeof useTemplateFill>;
  focusMissingSignal: number;
  disabled?: boolean;
}

/** Passo "Preencher": estados de carregamento e erro em volta do formulário. */
export function TemplateFillFields({ fill, focusMissingSignal, disabled }: TemplateFillFieldsProps) {
  if (fill.isLoading) return <LoadingState label="Carregando o modelo…" />;

  if (fill.isError || !fill.template) {
    return (
      <p role="alert" className="py-6 text-center text-sm text-foreground">
        {getErrorMessage(fill.error, 'Não foi possível carregar o modelo.')}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {fill.isAutofilling && (
        <p role="status" className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" />
          Buscando os dados do cliente…
        </p>
      )}
      {fill.autofillFailed && (
        <p role="status" className="text-xs text-muted-foreground">
          Não deu para puxar os dados do cliente. Preencha os campos à mão.
        </p>
      )}
      <PlaceholderForm
        placeholders={fill.placeholders}
        values={fill.values}
        onChange={fill.setValue}
        focusMissingSignal={focusMissingSignal}
        disabled={disabled}
      />
    </div>
  );
}
