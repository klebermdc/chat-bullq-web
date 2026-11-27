'use client';

import { PageShell } from '@/components/layout/page-shell';
import { useIsOrgManager } from '@/lib/permissions';
import { SocialPostsView } from '@/features/social-posts/components/social-posts-view';

/**
 * Publicações do Instagram sugeridas pela IA. Só dono e administrador: o
 * item do menu some para os demais e a API responde 403 a quem não é gestor.
 */
export default function PublicacoesPage() {
  const isManager = useIsOrgManager();
  return (
    <PageShell>
      <SocialPostsView isManager={isManager} />
    </PageShell>
  );
}
