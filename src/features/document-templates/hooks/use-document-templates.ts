'use client';

import { useQuery } from '@tanstack/react-query';
import { useOrgId } from '@/hooks/use-org-query-key';
import { documentTemplatesService } from '../services/document-templates.service';
import type { TemplateAudience } from '../types';

const TEMPLATES_STALE_MS = 60_000;

/** Raiz das chaves: invalidar `['document-templates', orgId]` atualiza tudo. */
export const documentTemplatesKeys = {
  all: (orgId: string | null) => ['document-templates', orgId] as const,
  list: (orgId: string | null, audience: TemplateAudience | undefined, includeInactive: boolean) =>
    ['document-templates', orgId, 'list', audience ?? 'ALL', includeInactive] as const,
  detail: (orgId: string | null, id: string) => ['document-templates', orgId, 'detail', id] as const,
  contracts: (conversationId: string) => ['conversation-contracts', conversationId] as const,
};

export function useDocumentTemplates(
  audience: TemplateAudience | undefined,
  { includeInactive = false, enabled = true }: { includeInactive?: boolean; enabled?: boolean } = {},
) {
  const orgId = useOrgId();
  return useQuery({
    queryKey: documentTemplatesKeys.list(orgId, audience, includeInactive),
    queryFn: () => documentTemplatesService.list({ audience, includeInactive }),
    enabled: enabled && !!orgId,
    staleTime: TEMPLATES_STALE_MS,
  });
}

export function useDocumentTemplate(id: string | null) {
  const orgId = useOrgId();
  return useQuery({
    queryKey: documentTemplatesKeys.detail(orgId, id ?? ''),
    queryFn: () => documentTemplatesService.get(id as string),
    enabled: !!orgId && !!id,
  });
}

export function useConversationContracts(conversationId: string) {
  return useQuery({
    queryKey: documentTemplatesKeys.contracts(conversationId),
    queryFn: () => documentTemplatesService.listContracts(conversationId),
    enabled: !!conversationId,
  });
}
