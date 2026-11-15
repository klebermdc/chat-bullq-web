'use client';

import { useQuery, type QueryClient } from '@tanstack/react-query';

/**
 * Links de assinatura que este navegador já recebeu (na criação ou no
 * reenvio). A listagem da API não devolve o link, então só dá para oferecer
 * "Copiar link" para o que passou por aqui nesta sessão.
 */
type ContractLinks = Readonly<Record<string, string>>;

const contractLinksKey = (conversationId: string) => ['contract-links', conversationId] as const;
const EMPTY_LINKS: ContractLinks = {};

export function useContractLinks(conversationId: string): ContractLinks {
  const { data } = useQuery({
    queryKey: contractLinksKey(conversationId),
    queryFn: () => EMPTY_LINKS,
    staleTime: Infinity,
    gcTime: Infinity,
  });
  return data ?? EMPTY_LINKS;
}

export function rememberContractLink(
  queryClient: QueryClient,
  conversationId: string,
  contractId: string,
  link: string | null,
): void {
  if (!link) return;
  queryClient.setQueryData<ContractLinks>(contractLinksKey(conversationId), (current) => ({
    ...(current ?? EMPTY_LINKS),
    [contractId]: link,
  }));
}
