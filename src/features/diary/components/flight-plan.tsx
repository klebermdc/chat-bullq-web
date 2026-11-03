import Link from 'next/link';
import { CalendarClock, KanbanSquare, MessageCircleReply, PlaneTakeoff, RotateCcw } from 'lucide-react';
import type {
  FlightPlan,
  FlightPlanCard,
  FlightPlanConversation,
  FlightPlanScheduled,
  FlightPlanSection,
} from '../api';
import { planTotal } from '../api';
import { formatClock, formatElapsed, formatMoney } from '../format';
import { conversationHref } from './diary-details';

const LINK_CLASS = 'text-sm font-medium text-primary underline-offset-2 hover:underline';

const ORIGIN_LABELS: Record<FlightPlanScheduled['origin'], string> = {
  MANUAL: 'agendada por você',
  AUTO_REENGAGE: 'retomada automática',
  CADENCE: 'cadência',
};

const pipelineHref = (pipelineId: string) => `/pipelines?p=${pipelineId}`;

function Step<T>({
  number,
  icon,
  title,
  hint,
  section,
  moreHref,
  render,
}: {
  number: number;
  icon: React.ReactNode;
  title: string;
  hint: string;
  section: FlightPlanSection<T>;
  moreHref: string;
  render: (item: T) => React.ReactNode;
}) {
  if (section.total === 0) return null;
  const hidden = section.total - section.items.length;
  return (
    <section className="space-y-2">
      <h3 className="flex items-center gap-2 font-semibold">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground tabular-nums">
          {number}
        </span>
        {icon}
        {title}
        <span className="tabular-nums text-muted-foreground">({section.total})</span>
      </h3>
      <p className="text-sm text-muted-foreground">{hint}</p>
      <ul className="divide-y divide-border rounded-lg border border-border">
        {section.items.map(render)}
      </ul>
      {hidden > 0 && (
        <Link href={moreHref} className={LINK_CLASS}>
          E mais {hidden}
        </Link>
      )}
    </section>
  );
}

function ConversationRow({ item, waiting, action, now }: { item: FlightPlanConversation; waiting: string; action: string; now: Date }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
      <span>
        <span className="font-medium">{item.contactName}</span>
        <span className="text-muted-foreground"> · {waiting} {formatElapsed(item.since, now)}</span>
      </span>
      <Link href={conversationHref(item.conversationId)} className={LINK_CLASS}>
        {action}
      </Link>
    </li>
  );
}

function CardRow({ item, now }: { item: FlightPlanCard; now: Date }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
      <span className="min-w-0">
        <span className="font-medium">{item.title}</span>
        {item.value !== null && <span className="tabular-nums"> · {formatMoney(item.value)}</span>}
        <span className="block text-muted-foreground">
          {item.contactName} · {item.pipelineName} › {item.stageName} · sem mudança {formatElapsed(item.since, now)}
        </span>
      </span>
      <span className="flex gap-3">
        {item.conversationId && (
          <Link href={conversationHref(item.conversationId)} className={LINK_CLASS}>
            Conversa
          </Link>
        )}
        <Link href={pipelineHref(item.pipelineId)} className={LINK_CLASS}>
          Abrir no CRM
        </Link>
      </span>
    </li>
  );
}

function ScheduledRow({ item }: { item: FlightPlanScheduled }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
      <span>
        <span className="font-medium tabular-nums">{formatClock(item.at)}</span>
        <span> · {item.contactName}</span>
        <span className="text-muted-foreground"> · {ORIGIN_LABELS[item.origin]}</span>
      </span>
      <Link href={conversationHref(item.conversationId)} className={LINK_CLASS}>
        Conferir
      </Link>
    </li>
  );
}

/** Primeira coisa do dia: em ordem, quem responder, retomar e o que destravar no CRM. */
export function FlightPlanView({ plan, now = new Date() }: { plan: FlightPlan; now?: Date }) {
  const sections = [plan.replyNow, plan.followUp, plan.stalledCards, plan.scheduledToday];
  // Numera só as listas que aparecem: 1, 2, 3 sem buracos.
  const numbers = sections.map((_, i) => sections.slice(0, i + 1).filter((s) => s.total > 0).length);
  return (
    <section aria-labelledby="plano-de-voo" className="space-y-5 rounded-xl border border-primary/30 bg-primary/5 p-4 sm:p-5">
      <header>
        <h2 id="plano-de-voo" className="flex items-center gap-2 text-lg font-semibold">
          <PlaneTakeoff aria-hidden="true" className="h-5 w-5 text-primary" />
          Plano de voo de hoje
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {planTotal(plan) === 0
            ? 'Nada pendente agora: caixa em dia e funil andando. Aproveite para revisar o CRM.'
            : 'Comece por aqui, de cima para baixo, antes de pegar conversa nova.'}
        </p>
      </header>

      <Step
        number={numbers[0]}
        icon={<MessageCircleReply aria-hidden="true" className="h-4 w-4 text-primary" />}
        title="Responder agora"
        hint="Clientes esperando a sua resposta. Quem espera há mais tempo está no topo."
        section={plan.replyNow}
        moreHref="/inbox"
        render={(item) => (
          <ConversationRow key={item.conversationId} item={item} waiting="esperando" action="Responder" now={now} />
        )}
      />
      <Step
        number={numbers[1]}
        icon={<RotateCcw aria-hidden="true" className="h-4 w-4 text-primary" />}
        title="Retomar contato"
        hint="A última mensagem foi sua e o cliente parou de responder. Passou de 24 horas? Use o ícone Retomar contato na conversa."
        section={plan.followUp}
        moreHref="/inbox"
        render={(item) => (
          <ConversationRow key={item.conversationId} item={item} waiting="sem resposta" action="Retomar" now={now} />
        )}
      />
      <Step
        number={numbers[2]}
        icon={<KanbanSquare aria-hidden="true" className="h-4 w-4 text-primary" />}
        title="Destravar no CRM"
        hint="Negócios seus parados há 3 dias ou mais. Mova de etapa, atualize ou marque como perdido."
        section={plan.stalledCards}
        moreHref="/pipelines"
        render={(item) => <CardRow key={item.cardId} item={item} now={now} />}
      />
      <Step
        number={numbers[3]}
        icon={<CalendarClock aria-hidden="true" className="h-4 w-4 text-primary" />}
        title="Agendado para hoje"
        hint="Mensagens que saem sozinhas hoje. Confira se ainda fazem sentido."
        section={plan.scheduledToday}
        moreHref="/inbox"
        render={(item) => <ScheduledRow key={`${item.conversationId}-${item.at}`} item={item} />}
      />

      <Link href="/pipelines" className={LINK_CLASS}>
        Ver o funil completo
      </Link>
    </section>
  );
}
