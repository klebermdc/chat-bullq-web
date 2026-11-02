import Link from 'next/link';
import { Dumbbell, Hourglass, MessagesSquare, Star, Target } from 'lucide-react';
import type { DiaryConversationReview, DiaryDetails, DiaryPending, DiaryScore } from '../api';
import { formatCriterion, formatWaitingSince } from '../format';

const MAX_SCORE = 5;
const LINK_CLASS = 'text-sm text-primary underline-offset-2 hover:underline';

export const conversationHref = (conversationId: string) =>
  `/inbox?conversationId=${conversationId}`;

function SectionTitle({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-2 text-base font-semibold">
      {icon}
      {children}
    </h2>
  );
}

export function FocusCallout({ focus }: { focus: string }) {
  return (
    <section className="rounded-lg border border-primary/30 bg-primary/5 p-4">
      <SectionTitle icon={<Target aria-hidden="true" className="h-5 w-5 text-primary" />}>
        Foco de hoje
      </SectionTitle>
      <p className="mt-2">{focus}</p>
    </section>
  );
}

export function PendingList({ pending }: { pending: DiaryPending[] }) {
  if (pending.length === 0) return null;
  return (
    <section className="space-y-3">
      <SectionTitle icon={<Hourglass aria-hidden="true" className="h-5 w-5 text-primary" />}>
        Clientes para retomar
      </SectionTitle>
      <ul className="divide-y divide-border rounded-lg border border-border">
        {pending.map((item) => (
          <li key={item.conversationId} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
            <span>
              <span className="font-medium">{item.contactName}</span>
              <span className="text-muted-foreground"> · esperando desde {formatWaitingSince(item.waitingSince)}</span>
            </span>
            <Link href={conversationHref(item.conversationId)} className={LINK_CLASS}>
              Abrir a conversa
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function ScoreList({ scores }: { scores: DiaryScore[] }) {
  if (scores.length === 0) return null;
  return (
    <section className="space-y-3">
      <SectionTitle icon={<Star aria-hidden="true" className="h-5 w-5 text-primary" />}>
        Notas do dia
      </SectionTitle>
      <ul className="space-y-3">
        {scores.map((item) => (
          <li key={item.criterion} className="rounded-lg border border-border p-3">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="font-medium">{formatCriterion(item.criterion)}</span>
              <span className="tabular-nums text-muted-foreground">{item.score} de {MAX_SCORE}</span>
            </div>
            <div aria-hidden="true" className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full bg-primary" style={{ width: `${(item.score / MAX_SCORE) * 100}%` }} />
            </div>
            {item.reason && <p className="mt-2 text-sm text-muted-foreground">{item.reason}</p>}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function PracticeCard({ practice }: { practice: NonNullable<DiaryDetails['practice']> }) {
  return (
    <section className="space-y-3">
      <SectionTitle icon={<Dumbbell aria-hidden="true" className="h-5 w-5 text-primary" />}>
        Treino do dia
      </SectionTitle>
      <div className="rounded-lg border border-border p-4 text-sm">
        <p className="text-muted-foreground">{practice.situation}</p>
        <p className="mt-3 font-medium">Resposta modelo</p>
        <blockquote className="mt-1 border-l-2 border-primary pl-3">{practice.reply}</blockquote>
      </div>
    </section>
  );
}

export function ConversationReviews({ reviews }: { reviews: DiaryConversationReview[] }) {
  if (reviews.length === 0) return null;
  return (
    <section className="space-y-3">
      <SectionTitle icon={<MessagesSquare aria-hidden="true" className="h-5 w-5 text-primary" />}>
        Conversa a conversa
      </SectionTitle>
      {reviews.map((review) => (
        <article key={review.conversationId} className="rounded-lg border border-border p-4">
          <h3 className="font-medium">{review.contactName}</h3>
          {review.topic && <p className="text-sm text-muted-foreground">{review.topic}</p>}
          <p className="mt-2 text-sm">{review.assessment}</p>
          {review.nextStep && (
            <p className="mt-2 text-sm">
              <span className="font-medium">Próximo passo: </span>
              {review.nextStep}
            </p>
          )}
          <Link href={conversationHref(review.conversationId)} className={`mt-2 inline-block ${LINK_CLASS}`}>
            Abrir a conversa
          </Link>
        </article>
      ))}
    </section>
  );
}
