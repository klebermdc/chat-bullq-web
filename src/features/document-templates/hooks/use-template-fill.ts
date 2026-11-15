'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { dateFillValues } from '../lib/date-fill';
import { mergeValues, missingPlaceholders } from '../lib/placeholders';
import { documentTemplatesService } from '../services/document-templates.service';
import type { PlaceholderValues } from '../types';
import { useDocumentTemplate } from './use-document-templates';

interface UseTemplateFillOptions {
  templateId: string | null;
  /** Com conversa, a API sugere os valores (nome, CPF, pedido…). */
  conversationId?: string;
}

/**
 * Estado do preenchimento de um modelo: carrega o modelo, sugere a data do
 * dia e, havendo conversa, o autopreenchimento da API, sem nunca apagar o que
 * a pessoa já digitou. Compartilhado entre o contrato do cliente e o PDF interno.
 */
export function useTemplateFill({ templateId, conversationId }: UseTemplateFillOptions) {
  const templateQuery = useDocumentTemplate(templateId);
  const template = templateQuery.data;
  const [values, setValues] = useState<PlaceholderValues>({});
  const [isAutofilling, setIsAutofilling] = useState(false);
  const [autofillFailed, setAutofillFailed] = useState(false);

  // Trocar de modelo começa do zero.
  useEffect(() => {
    setValues({});
    setAutofillFailed(false);
  }, [templateId]);

  useEffect(() => {
    if (!template) return;
    setValues((current) => mergeValues(current, dateFillValues(template.placeholders)));
    if (!conversationId) return;

    let cancelled = false;
    setIsAutofilling(true);
    documentTemplatesService
      .autofill(template.id, conversationId)
      .then((suggested) => {
        if (!cancelled) setValues((current) => mergeValues(current, suggested));
      })
      .catch(() => {
        // Sem sugestão o atendente preenche à mão; só avisamos na tela.
        if (!cancelled) setAutofillFailed(true);
      })
      .finally(() => {
        if (!cancelled) setIsAutofilling(false);
      });
    return () => {
      cancelled = true;
    };
  }, [template, conversationId]);

  const setValue = useCallback((placeholder: string, value: string) => {
    setValues((current) => ({ ...current, [placeholder]: value }));
  }, []);

  const placeholders = useMemo(() => template?.placeholders ?? [], [template]);
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
    isAutofilling,
    autofillFailed,
  };
}
