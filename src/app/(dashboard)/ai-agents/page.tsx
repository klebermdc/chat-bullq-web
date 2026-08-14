'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

/**
 * Rota antiga do Jarvis, mantida só como redirect: a página virou
 * /settings/jarvis. Preserva o `?tab=` pra que links e favoritos antigos
 * (inclusive o /ai-agents?tab=runs do banner de falha de tool) caiam na
 * aba certa em vez de 404.
 */
export default function AiAgentsRedirectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab') ?? 'overview';

  useEffect(() => {
    router.replace(`/settings/jarvis?tab=${tab}`);
  }, [router, tab]);

  return null;
}
