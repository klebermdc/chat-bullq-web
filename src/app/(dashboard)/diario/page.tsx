'use client';

import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { usePageTitle } from '@/components/layout/use-page-title';
import { useAuthStore } from '@/stores/auth-store';
import { fetchMyDiary, markDiaryViewed, MY_DIARY_QUERY_KEY } from '@/features/diary/api';
import { DiaryTeamPanel } from '@/features/diary/components/diary-team-panel';
import { DiaryView } from '@/features/diary/components/diary-view';

const MANAGER_ROLES = ['OWNER', 'ADMIN'];

export default function DiarioPage() {
  usePageTitle('Meu diário');
  const queryClient = useQueryClient();
  const { organizations, activeOrgId } = useAuthStore();
  const role = organizations.find((o) => o.id === activeOrgId)?.role ?? '';

  const { data: diary, isLoading, isError } = useQuery({
    queryKey: MY_DIARY_QUERY_KEY,
    queryFn: fetchMyDiary,
  });

  const diaryId = diary && !diary.viewedAt ? diary.id : null;
  useEffect(() => {
    if (!diaryId) return;
    markDiaryViewed(diaryId)
      .then(() => queryClient.invalidateQueries({ queryKey: MY_DIARY_QUERY_KEY }))
      // Falhar aqui só mantém o aviso aberto; a leitura não pode quebrar.
      .catch((err: unknown) => console.warn('diary_mark_viewed_failed', err));
  }, [diaryId, queryClient]);

  return (
    <div className="mx-auto h-full max-w-3xl space-y-8 overflow-y-auto px-4 py-6 sm:px-6">
      {isLoading && <p className="text-sm text-muted-foreground">Carregando seu diário…</p>}
      {isError && (
        <p role="alert" className="text-sm text-urgent-ink">
          Não foi possível carregar seu diário. Tente de novo em instantes.
        </p>
      )}
      {!isLoading && !isError && !diary && (
        <p className="text-sm text-muted-foreground">
          Seu diário ainda não está disponível. Ele aparece aqui na manhã seguinte a um dia de atendimentos.
        </p>
      )}
      {diary && <DiaryView diary={diary} />}
      {MANAGER_ROLES.includes(role) && <DiaryTeamPanel />}
    </div>
  );
}
