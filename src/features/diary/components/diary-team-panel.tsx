'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { getErrorMessage } from '@/lib/errors';
import { fetchDiaryParticipants, fetchTeamDiaries, generateDiary, type ManagerDiary } from '../api';
import { formatDiaryDay } from '../format';
import { DiaryView } from './diary-view';

const TEAM_QUERY_KEY = ['attendant-diary', 'team'];

const STATUS_LABEL: Record<ManagerDiary['status'], string> = {
  READY: 'Pronto',
  EMPTY: 'Sem atendimentos',
  FAILED: 'Falhou',
};

/** Conferência do piloto: diários da equipe e geração sob demanda. */
export function DiaryTeamPanel() {
  const queryClient = useQueryClient();
  const [openId, setOpenId] = useState<string | null>(null);

  const { data: participants = [] } = useQuery({
    queryKey: [...TEAM_QUERY_KEY, 'participants'],
    queryFn: fetchDiaryParticipants,
  });
  const { data: diaries = [], isError } = useQuery({
    queryKey: TEAM_QUERY_KEY,
    queryFn: () => fetchTeamDiaries(),
  });

  const generate = useMutation({
    mutationFn: generateDiary,
    onSuccess: () => {
      toast.success('Geração iniciada. Atualize em alguns minutos.');
      queryClient.invalidateQueries({ queryKey: TEAM_QUERY_KEY });
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Não foi possível gerar o diário.')),
  });

  const nameOf = (userId: string) =>
    participants.find((p) => p.userId === userId)?.name ?? 'Atendente';

  return (
    <section className="space-y-4 border-t border-border pt-6">
      <h2 className="text-base font-semibold">Diários da equipe</h2>

      {participants.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Nenhum participante configurado. Enquanto a lista estiver vazia, nada é gerado.
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {participants.map((p) => (
          <Button
            key={p.userId}
            variant="outline"
            disabled={generate.isPending}
            onClick={() => generate.mutate(p.userId)}
          >
            Gerar ontem: {p.name}
          </Button>
        ))}
      </div>

      {isError && (
        <p role="alert" className="text-sm text-urgent-ink">
          Não foi possível carregar os diários da equipe.
        </p>
      )}

      <ul className="space-y-2">
        {diaries.map((diary) => (
          <li key={diary.id} className="rounded-lg border border-border">
            <button
              type="button"
              aria-expanded={openId === diary.id}
              onClick={() => setOpenId(openId === diary.id ? null : diary.id)}
              className="flex w-full flex-wrap items-center justify-between gap-2 p-3 text-left text-sm"
            >
              <span className="font-medium">
                {nameOf(diary.userId)} · {formatDiaryDay(diary.day)}
              </span>
              <span className="text-muted-foreground">
                {STATUS_LABEL[diary.status]}
                {diary.viewedAt ? ' · lido' : ''}
                {diary.discardedPoints > 0 ? ` · ${diary.discardedPoints} descartados` : ''}
              </span>
            </button>
            {openId === diary.id && (
              <div className="border-t border-border p-4">
                {diary.errorMessage && (
                  <p role="alert" className="mb-3 text-sm text-urgent-ink">{diary.errorMessage}</p>
                )}
                <DiaryView diary={diary} />
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
