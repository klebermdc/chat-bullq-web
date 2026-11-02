'use client';

import Link from 'next/link';
import { CheckCircle2, Lightbulb } from 'lucide-react';
import type { Diary, DiaryPoint } from '../api';
import { formatCriterion, formatDiaryDay, formatMinutes } from '../format';
import {
  ConversationReviews,
  FocusCallout,
  PendingList,
  PracticeCard,
  ScoreList,
  conversationHref,
} from './diary-details';

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function PointCard({ point }: { point: DiaryPoint }) {
  return (
    <article className="rounded-lg border border-border p-4">
      <p className="text-xs text-muted-foreground">{formatCriterion(point.criterion)}</p>
      <h3 className="font-medium">{point.title}</h3>
      {point.explanation && (
        <p className="mt-1 text-sm text-muted-foreground">{point.explanation}</p>
      )}
      <blockquote className="mt-3 border-l-2 border-border pl-3 text-sm">
        “{point.quote}”
      </blockquote>
      {point.suggestion && (
        <p className="mt-3 text-sm">
          <span className="font-medium">Tente assim: </span>
          {point.suggestion}
        </p>
      )}
      <Link
        href={conversationHref(point.conversationId)}
        className="mt-3 inline-block text-sm text-primary underline-offset-2 hover:underline"
      >
        Abrir a conversa
      </Link>
    </article>
  );
}

function PointSection({
  title,
  icon,
  points,
}: {
  title: string;
  icon: React.ReactNode;
  points: DiaryPoint[];
}) {
  if (points.length === 0) return null;
  return (
    <section className="space-y-3">
      <h2 className="flex items-center gap-2 text-base font-semibold">
        {icon}
        {title}
      </h2>
      {points.map((point) => (
        <PointCard key={`${point.conversationId}-${point.quote}`} point={point} />
      ))}
    </section>
  );
}

export function DiaryView({ diary }: { diary: Diary }) {
  const { metrics, details } = diary;
  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm text-muted-foreground first-letter:uppercase">
          {formatDiaryDay(diary.day)}
        </p>
        {diary.summary && <p className="mt-2 text-lg">{diary.summary}</p>}
      </header>

      {details?.focus && <FocusCallout focus={details.focus} />}

      <section aria-label="Números do dia" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric label="Conversas atendidas" value={metrics.conversations} />
        <Metric label="Mensagens enviadas" value={metrics.messagesSent} />
        <Metric label="Tempo típico de resposta" value={formatMinutes(metrics.medianReplyMinutes)} />
        <Metric label="Maior espera" value={formatMinutes(metrics.longestReplyMinutes)} />
        <Metric label="Respostas demoradas" value={metrics.slowReplies} />
        <Metric label="Clientes sem resposta" value={metrics.unansweredAtEndOfDay} />
        <Metric label="Tempo online" value={formatMinutes(metrics.onlineMinutes)} />
      </section>

      <PendingList pending={details?.pending ?? []} />
      <ScoreList scores={details?.scores ?? []} />

      <PointSection
        title="O que você fez bem"
        icon={<CheckCircle2 aria-hidden="true" className="h-5 w-5 text-primary" />}
        points={diary.strengths}
      />
      <PointSection
        title="Para melhorar hoje"
        icon={<Lightbulb aria-hidden="true" className="h-5 w-5 text-primary" />}
        points={diary.improvements}
      />
      {details?.practice && <PracticeCard practice={details.practice} />}
      <ConversationReviews reviews={details?.conversations ?? []} />
    </div>
  );
}
