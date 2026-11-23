'use client';

import Link from 'next/link';
import { CalendarDays, Flame, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ClientCard, IntentLevel, Room } from '../../api';
import { formatDay, intentLabel, presenceLabel, waitedLabel } from '../../lib/labels';
import { num, Stat, StatGrid } from './stat';

const INTENT_PILL: Record<IntentLevel, string> = {
  hot: 'bg-urgent-wash text-urgent-ink',
  warm: 'bg-warning-wash text-warning-ink',
  cold: 'bg-muted text-muted-foreground',
};

function IntentPill({ intent }: { intent: NonNullable<ClientCard['intent']> }) {
  const label = intentLabel(intent.level);
  if (!label) return null;
  return (
    <span
      className={cn('shrink-0 rounded-full px-2 py-0.5 text-xs font-medium tabular-nums', INTENT_PILL[intent.level])}
      title={intent.reasons.join(' · ')}
    >
      {label} {intent.score}
    </span>
  );
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** "3 quentes · 10 mornos · 5 frios", com destaque para quente esperando. */
function IntentSummary({ counts }: { counts: NonNullable<Room['intent']> }) {
  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
      <span className="inline-flex items-center gap-1 font-medium text-urgent-ink">
        <Flame className="size-3.5" aria-hidden /> {plural(counts.hot, 'quente', 'quentes')}
      </span>
      <span>· {plural(counts.warm, 'morno', 'mornos')}</span>
      <span>· {plural(counts.cold, 'frio', 'frios')}</span>
      {counts.hotWaiting > 0 && (
        <span className="rounded-full bg-urgent-wash px-2 py-0.5 text-urgent-ink">
          {plural(counts.hotWaiting, 'quente esperando', 'quentes esperando')}
        </span>
      )}
    </p>
  );
}

function ClientList({ clients }: { clients: Room['clients'] }) {
  if (clients.length === 0) return <p className="text-sm text-muted-foreground">Nenhuma conversa aberta.</p>;
  return (
    <ul className="space-y-1.5">
      {clients.map((c) => (
        <li key={c.conversationId}>
          <Link
            href={`/inbox?conversationId=${encodeURIComponent(c.conversationId)}`}
            className="flex items-center gap-2 rounded-md border bg-card px-2.5 py-2 text-sm hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"
          >
            <MessageCircle className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{c.name}</span>
              <span className="block truncate text-xs text-muted-foreground">
                {[c.phoneMasked, ...(c.intent?.reasons.slice(0, 2) ?? [])].filter(Boolean).join(' · ')}
              </span>
            </span>
            {c.awaitingReply && (
              <span className="rounded-full bg-warning-wash px-2 py-0.5 text-xs text-warning-ink">Esperando</span>
            )}
            {c.intent && <IntentPill intent={c.intent} />}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function GuideDates({ guide }: { guide: NonNullable<Room['guide']> }) {
  return (
    <section className="space-y-2">
      <h3 className="flex items-center gap-1.5 text-sm font-semibold">
        <CalendarDays className="size-4" aria-hidden /> Guiamentos (14 dias)
      </h3>
      {(guide.dates ?? []).length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum guiamento marcado.</p>
      ) : (
        <ul className="space-y-1 text-sm">
          {guide.dates.map((d) => (
            <li key={`${d.contractId}-${d.date}-${d.parkLabel}`} className="flex gap-2">
              <span className="w-11 shrink-0 tabular-nums text-muted-foreground">{formatDay(d.date)}</span>
              <span className="min-w-0 flex-1 truncate">
                {d.parkLabel} · {d.clientName}
              </span>
              {!d.purchased && <span className="text-xs text-warning-ink">ingresso pendente</span>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Sala de uma pessoa: carteira, clientes e guiamentos. */
export function PersonDetails({ room, now }: { room: Room; now: Date }) {
  const waited = waitedLabel(room.awaitingOldestSince, now);
  const stats = room.stats ?? ({} as Partial<Room['stats']>);
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {presenceLabel(room.presence)}
        {waited && <> · cliente esperando há {waited}</>}
      </p>
      <StatGrid>
        <Stat label="Na carteira" value={num(stats.openTotal)} />
        <Stat label="Esperando resposta" value={num(stats.awaitingReply)} />
        <Stat label="Recebidos hoje" value={num(stats.assignedToday)} />
        <Stat label="Finalizados hoje" value={num(stats.closedToday)} />
      </StatGrid>
      {typeof stats.avgPickupMinutes === 'number' && (
        <p className="text-xs text-muted-foreground">
          Tempo médio até a 1ª resposta hoje: {stats.avgPickupMinutes} min
        </p>
      )}
      <section className="space-y-2">
        <h3 className="text-sm font-semibold">
          Clientes {room.intent && <span className="font-normal text-muted-foreground">(mais quentes primeiro)</span>}
        </h3>
        {room.intent && <IntentSummary counts={room.intent} />}
        <ClientList clients={room.clients ?? []} />
      </section>
      {room.guide && <GuideDates guide={room.guide} />}
    </div>
  );
}
