'use client';

import { useCallback, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { dateFillValues } from '../lib/date-fill';
import { missingPlaceholders } from '../lib/placeholders';
import { documentTemplatesService } from '../services/document-templates.service';
import type { PlaceholderValues } from '../types';
import { useDocumentTemplate } from './use-document-templates';

interface UseTemplateFillOptions {
  templateId: string | null;
  /** Com conversa, a API sugere os valores (nome, CPF, pedido…). */
  conversationId?: string;
}

/** O que a pessoa digitou, amarrado ao modelo: trocar de modelo começa do zero. */
interface TypedValues {
  templateId: string | null;
  values: PlaceholderValues;
}

/**
 * Estado do preenchimento de um modelo. Os valores finais são as sugestões
 * (data do dia e, havendo conversa, o autopreenchimento da API) por baixo do
 * que a pessoa digitou: campo mexido nunca é sobrescrito, nem quando ela o
 * esvazia. Compartilhado entre o contrato do cliente e o PDF interno.
 */
export function useTemplateFill({ templateId, conversationId }: UseTemplateFillOptions) {
  const templateQuery = useDocumentTemplate(templateId);
  const template = templateQuery.data;
  const [typed, setTyped] = useState<TypedValues>({ templateId: null, values: {} });

  const autofillQuery = useQuery({
    queryKey: ['document-autofill', templateId, conversationId],
    queryFn: () => documentTemplatesService.autofill(templateId as string, conversationId as string),
    enabled: !!templateId && !!conversationId && !!template,
    retry: false,
  });

  const placeholders = useMemo(() => template?.placeholders ?? [], [template]);
  const dateValues = useMemo(() => dateFillValues(placeholders), [placeholders]);
  const typedValues = typed.templateId === templateId ? typed.values : null;

  const values = useMemo<PlaceholderValues>(
    () => ({ ...dateValues, ...(autofillQuery.data ?? {}), ...(typedValues ?? {}) }),
    [dateValues, autofillQuery.data, typedValues],
  );

  const setValue = useCallback(
    (placeholder: string, value: string) => {
      setTyped((current) => ({
        templateId,
        values: { ...(current.templateId === templateId ? current.values : {}), [placeholder]: value },
      }));
    },
    [templateId],
  );

  const missing = useMemo(() => missingPlaceholders(placeholders, values), [placeholders, values]);

  /** Só os campos do modelo, sem sobra de sugestão que não pertence a ele. */
  const payloadValues = useMemo(
    () => Object.fromEntries(placeholders.map((p) => [p, (values[p] ?? '').trim()])),
    [placeholders, values],
  );

  return {
    template,
    isLoading: templateQuery.isLoading,
    isError: templateQuery.isError,
    error: templateQuery.error,
    placeholders,
    values,
    payloadValues,
    setValue,
    missing,
    isAutofilling: autofillQuery.isFetching,
    // Sem sugestão o atendente preenche à mão; só avisamos na tela.
    autofillFailed: autofillQuery.isError,
  };
}
