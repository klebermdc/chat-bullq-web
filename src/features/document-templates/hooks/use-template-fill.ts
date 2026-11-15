'use client';

import { useCallback, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { dateFillValues } from '../lib/date-fill';
import { groupFields } from '../lib/field-groups';
import { fieldOrigins, mergeLayers, pickAiValues, type FillLayers } from '../lib/field-origin';
import { missingPlaceholders } from '../lib/placeholders';
import { documentTemplatesService } from '../services/document-templates.service';
import type { PlaceholderValues } from '../types';
import { useDocumentTemplate } from './use-document-templates';

interface UseTemplateFillOptions {
  templateId: string | null;
  /** Com conversa, a API sugere os valores (nome, CPF, pedido…). */
  conversationId?: string;
}

/** Uma camada de valores amarrada ao modelo: trocar de modelo começa do zero. */
interface LayerState {
  templateId: string | null;
  values: PlaceholderValues;
}

const EMPTY_LAYER: LayerState = { templateId: null, values: {} };
const EMPTY_VALUES: PlaceholderValues = {};

/**
 * Estado do preenchimento de um modelo. Os valores finais são as sugestões
 * (data do dia, o autopreenchimento da API e o que a IA achou) por baixo do
 * que a pessoa digitou: campo mexido nunca é sobrescrito, nem quando ela o
 * esvazia. Compartilhado entre o contrato do cliente e o PDF interno.
 */
export function useTemplateFill({ templateId, conversationId }: UseTemplateFillOptions) {
  const templateQuery = useDocumentTemplate(templateId);
  const template = templateQuery.data;
  const [typed, setTyped] = useState<LayerState>(EMPTY_LAYER);
  const [ai, setAi] = useState<LayerState>(EMPTY_LAYER);

  const autofillQuery = useQuery({
    queryKey: ['document-autofill', templateId, conversationId],
    queryFn: () => documentTemplatesService.autofill(templateId as string, conversationId as string),
    enabled: !!templateId && !!conversationId && !!template,
    retry: false,
  });

  const placeholders = useMemo(() => template?.placeholders ?? [], [template]);
  const dateValues = useMemo(() => dateFillValues(placeholders), [placeholders]);
  const autofill = autofillQuery.data;

  const layers = useMemo<FillLayers>(
    () => ({
      dateValues,
      autofillValues: autofill?.values ?? EMPTY_VALUES,
      autofillSources: autofill?.sources ?? {},
      aiValues: ai.templateId === templateId ? ai.values : EMPTY_VALUES,
      typedValues: typed.templateId === templateId ? typed.values : EMPTY_VALUES,
    }),
    [dateValues, autofill, ai, typed, templateId],
  );

  const values = useMemo(() => mergeLayers(layers), [layers]);
  const origins = useMemo(() => fieldOrigins(placeholders, layers), [placeholders, layers]);
  const sections = useMemo(() => groupFields(placeholders, autofill?.groups ?? null), [placeholders, autofill]);

  const setValue = useCallback(
    (placeholder: string, value: string) => {
      setTyped((current) => ({
        templateId,
        values: { ...(current.templateId === templateId ? current.values : {}), [placeholder]: value },
      }));
    },
    [templateId],
  );

  /** Aplica o que a IA achou só nos campos vazios; devolve quantos preencheu. */
  const applyAiValues = useCallback(
    (suggested: PlaceholderValues): number => {
      const picked = pickAiValues(placeholders, values, suggested);
      const count = Object.keys(picked).length;
      if (count === 0) return 0;
      setAi((current) => ({
        templateId,
        values: { ...(current.templateId === templateId ? current.values : {}), ...picked },
      }));
      return count;
    },
    [placeholders, values, templateId],
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
    applyAiValues,
    origins,
    sections,
    missing,
    isAutofilling: autofillQuery.isFetching,
    // Sem sugestão o atendente preenche à mão; só avisamos na tela.
    autofillFailed: autofillQuery.isError,
  };
}
