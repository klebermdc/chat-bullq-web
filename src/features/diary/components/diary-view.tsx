'use client';

import Link from 'next/link';
import { BarChart3, CheckCircle2, GraduationCap, Lightbulb } from 'lucide-react';
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

/**
 * O mini treinamento: o que o dia anterior ensina. É a primeira coisa da
 * página; os números ficam no relatório, depois do plano de voo.
 */
export function DiaryTraining({ diary }: { diary: Diary }) {
  const { details } = diary;
  return (
    <section aria-labelledby="treino-de-hoje" className="space-y-6">
      <header>
        <h1 id="treino-de-hoje" className="flex items-center gap-2 text-xl font-semibold">
          <GraduationCap aria-hidden="true" className="h-6 w-6 text-primary" />
          Treino de hoje
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Com base nos seus atendimentos de <span className="lowercase">{formatDiaryDay(diary.day)}</span>
        </p>
        {diary.summary && <p className="mt-3 text-lg">{diary.summary}</p>}
      </header>

      {details?.focus && <FocusCallout focus={details.focus} />}
      <PointSection
        title="Para melhorar hoje"
        icon={<Lightbulb aria-hidden="true" className="h-5 w-5 text-primary" />}
        points={diary.improvements}
      />
      {details?.practice && <PracticeCard practice={details.practice} />}
      <PointSection
        title="O que você fez bem"
        icon={<CheckCircle2 aria-hidden="true" className="h-5 w-5 text-primary" />}
        points={diary.strengths}
      />
    </section>
  );
}

/** Números e detalhes do dia anterior, para consulta. */
export function DiaryDayReport({ diary }: { diary: Diary }) {
  const { metrics, details } = diary;
  return (
    <section aria-labelledby="seu-dia" className="space-y-6">
      <h2 id="seu-dia" className="flex items-center gap-2 text-lg font-semibold">
        <BarChart3 aria-hidden="true" className="h-5 w-5 text-primary" />
        Seu dia em números
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric label="Conversas atendidas" value={metrics.conversations} />
        <Metric label="Mensagens enviadas" value={metrics.messagesSent} />
        <Metric label="Tempo típico de resposta" value={formatMinutes(metrics.medianReplyMinutes)} />
        <Metric label="Maior espera" value={formatMinutes(metrics.longestReplyMinutes)} />
        <Metric label="Respostas demoradas" value={metrics.slowReplies} />
        <Metric label="Clientes sem resposta" value={metrics.unansweredAtEndOfDay} />
        <Metric label="Tempo online" value={formatMinutes(metrics.onlineMinutes)} />
      </div>

      <PendingList pending={details?.pending ?? []} />
      <ScoreList scores={details?.scores ?? []} />
      <ConversationReviews reviews={details?.conversations ?? []} />
    </section>
  );
}

/** Diário inteiro numa coluna, para o gestor conferir no painel da equipe. */
export function DiaryView({ diary }: { diary: Diary }) {
  return (
    <div className="space-y-8">
      <DiaryTraining diary={diary} />
      <DiaryDayReport diary={diary} />
    </div>
  );
}
