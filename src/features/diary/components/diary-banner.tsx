'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { BookOpen } from 'lucide-react';
import { fetchMyDiary, fetchMyPlan, MY_DIARY_QUERY_KEY, MY_PLAN_QUERY_KEY, planTotal } from '../api';
import { wasPlanSeenToday } from '../plan-seen';
import { bannerMessage } from './diary-banner-message';

const RECHECK_MS = 30 * 60 * 1000;

const QUERY_OPTIONS = { refetchInterval: RECHECK_MS, staleTime: RECHECK_MS, retry: false } as const;

/** Aviso ao entrar: fica visível até a pessoa abrir o treino e o plano do dia. */
export function DiaryBanner() {
  const pathname = usePathname();
  const { data: diary } = useQuery({ queryKey: MY_DIARY_QUERY_KEY, queryFn: fetchMyDiary, ...QUERY_OPTIONS });
  const { data: plan } = useQuery({ queryKey: MY_PLAN_QUERY_KEY, queryFn: fetchMyPlan, ...QUERY_OPTIONS });

  if (pathname === '/diario') return null;
  const message = bannerMessage({
    hasNewDiary: Boolean(diary && !diary.viewedAt),
    pendingCount: plan ? planTotal(plan) : 0,
    planSeenToday: wasPlanSeenToday(),
  });
  if (!message) return null;

  return (
    <div role="status" className="border-b border-border bg-card px-4 py-2.5 sm:px-6">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
        <BookOpen aria-hidden="true" className="h-4 w-4 flex-shrink-0 text-primary" />
        <span className="min-w-0 flex-1 basis-48 font-medium">{message.text}</span>
        <Link href="/diario" className="font-medium text-primary underline-offset-2 hover:underline">
          {message.link}
        </Link>
      </div>
    </div>
  );
}
