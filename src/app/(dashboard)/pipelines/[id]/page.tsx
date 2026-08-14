'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

/**
 * O board deixou de ter rota própria — virou a pílula do pipeline dentro
 * de /pipelines. Rota mantida como redirect pra links e favoritos antigos.
 */
export default function PipelineBoardRedirectPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id;

  useEffect(() => {
    router.replace(id ? `/pipelines?p=${id}` : '/pipelines');
  }, [router, id]);

  return null;
}
