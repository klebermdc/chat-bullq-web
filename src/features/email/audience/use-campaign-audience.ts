'use client';

import { useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAudienceCount } from '@/hooks/use-email';
import { emailApi, type Campaign } from '@/lib/email-api';
import {
  audienceFiltersEqual,
  filterFormStateFromFilter,
  toAudienceFilterPayload,
  type AudienceFilterFormState,
} from './audience-filter.util';

/**
 * Junta o estado do filtro de público (editável na tela), a contagem ao
 * vivo e o salvamento — a peça central da segmentação.
 *
 * `dirty` é o que impede o acidente central desta fatia: o disparo usa o
 * `audienceFilter` SALVO na campanha, não o que está na tela. Enquanto
 * `dirty` for `true`, a página de detalhe trava o botão de disparar — sem
 * isso, o operador veria "312 pessoas" no painel e mandaria para as 956
 * salvas antes, porque esqueceu de salvar o filtro.
 *
 * `campaign` é opcional para o hook poder ser chamado incondicionalmente
 * (regra dos hooks) mesmo antes da campanha terminar de carregar — a
 * página que consome isto trata o carregamento fora daqui.
 */
export function useCampaignAudience(campaign: Campaign | undefined) {
  const [formState, setFormState] = useState<AudienceFilterFormState>(() =>
    filterFormStateFromFilter(campaign?.audienceFilter),
  );

  // Preenche o formulário UMA vez, quando a campanha chega — nunca depois,
  // ou reescreveria o que o operador está digitando a cada refetch.
  const initializedRef = useRef(false);
  useEffect(() => {
    if (initializedRef.current || !campaign) return;
    setFormState(filterFormStateFromFilter(campaign.audienceFilter));
    initializedRef.current = true;
  }, [campaign]);

  const currentFilter = toAudienceFilterPayload(formState);
  const savedFilter = toAudienceFilterPayload(filterFormStateFromFilter(campaign?.audienceFilter));
  const dirty = !audienceFiltersEqual(currentFilter, savedFilter);

  const countQ = useAudienceCount(
    campaign?.id ?? '',
    currentFilter,
    Boolean(campaign) && campaign?.status === 'DRAFT',
  );

  const qc = useQueryClient();
  const saveMutation = useMutation({
    // PUT substitui a campanha inteira — mesmo formato do editor de
    // conteúdo (ver campanhas/[id]/editar/page.tsx): manda tudo que já
    // estava carregado, só trocando o campo que esta tela edita.
    mutationFn: () => {
      if (!campaign) throw new Error('Campanha ainda não carregada.');
      return emailApi.updateCampaign(campaign.id, {
        name: campaign.name,
        subject: campaign.subject,
        preheader: campaign.preheader ?? undefined,
        fromName: campaign.fromName ?? undefined,
        content: campaign.content,
        audienceFilter: currentFilter,
      });
    },
    onSuccess: () => {
      if (!campaign) return;
      qc.invalidateQueries({ queryKey: ['email', 'campaign', campaign.id] });
      qc.invalidateQueries({ queryKey: ['email', 'campaigns'] });
    },
  });

  return {
    formState,
    setFormState,
    currentFilter,
    dirty,
    countQ,
    saveMutation,
  };
}

export type UseCampaignAudienceResult = ReturnType<typeof useCampaignAudience>;
