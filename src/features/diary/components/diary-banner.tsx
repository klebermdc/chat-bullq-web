'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { BookOpen } from 'lucide-react';
import { fetchMyDiary, MY_DIARY_QUERY_KEY } from '../api';

const RECHECK_MS = 30 * 60 * 1000;

/** Aviso ao entrar: fica visível até a pessoa abrir o diário do dia. */
export function DiaryBanner() {
  const pathname = usePathname();
  const { data: diary } = useQuery({
    queryKey: MY_DIARY_QUERY_KEY,
    queryFn: fetchMyDiary,
    refetchInterval: RECHECK_MS,
    staleTime: RECHECK_MS,
    retry: false,
  });

  if (!diary || diary.viewedAt || pathname === '/diario') return null;

  return (
    <div role="status" className="border-b border-border bg-card px-4 py-2.5 sm:px-6">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
        <BookOpen aria-hidden="true" className="h-4 w-4 flex-shrink-0 text-primary" />
        <span className="min-w-0 flex-1 basis-48 font-medium">
          Seu diário está pronto: um minuto para começar o dia melhor.
        </span>
        <Link href="/diario" className="font-medium text-primary underline-offset-2 hover:underline">
          Ler agora
        </Link>
      </div>
    </div>
  );
}
