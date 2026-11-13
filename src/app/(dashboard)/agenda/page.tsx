'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { usePageTitle } from '@/components/layout/use-page-title';
import { Button } from '@/components/ui/button';
import { controlCls } from '@/components/ui/control';
import { EmptyState, LoadingState } from '@/components/ui/empty-state';
import { getErrorMessage } from '@/lib/errors';
import { useAuthStore } from '@/stores/auth-store';
import { membersService } from '@/features/settings/services/members.service';
import { AGENDA_QUERY_KEY, fetchAgenda, type Appointment } from '@/features/agenda/api';
import { dayKey, dayLabel, groupByDay, weekRange } from '@/features/agenda/format';
import { AppointmentItem } from '@/features/agenda/components/appointment-item';
import { ScheduleCallbackDialog } from '@/features/agenda/components/schedule-callback-dialog';

const MANAGER_ROLES = ['OWNER', 'ADMIN'];

export default function AgendaPage() {
  usePageTitle('Agenda');
  const { organizations, activeOrgId } = useAuthStore();
  const isManager = MANAGER_ROLES.includes(organizations.find((o) => o.id === activeOrgId)?.role ?? '');
  const [offset, setOffset] = useState(0);
  const [ownerUserId, setOwnerUserId] = useState<string>('');
  const [rescheduling, setRescheduling] = useState<Appointment | null>(null);

  const week = useMemo(() => weekRange(new Date(), offset), [offset]);
  const today = dayKey(new Date());

  const members = useQuery({
    queryKey: ['organization-members'],
    queryFn: () => membersService.list(),
    enabled: isManager,
  });

  const agenda = useQuery({
    queryKey: [...AGENDA_QUERY_KEY, week.from, week.to, ownerUserId || 'all'],
    queryFn: () => fetchAgenda({ from: week.from, to: week.to, ownerUserId: ownerUserId || undefined }),
  });

  const byDay = useMemo(() => groupByDay(agenda.data ?? []), [agenda.data]);
  const days = week.days.filter((d) => byDay.has(d));

  return (
    <div className="mx-auto w-full max-w-4xl space-y-4 p-4 sm:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Agenda</h1>
          <p className="text-sm text-muted-foreground">
            {isManager ? 'Retornos e reuniões da equipe.' : 'Seus retornos e reuniões. A Aline também marca aqui quando liga para o cliente.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isManager && (
            <select
              aria-label="Vendedor"
              value={ownerUserId}
              onChange={(e) => setOwnerUserId(e.target.value)}
              className={controlCls}
            >
              <option value="">Todos os vendedores</option>
              {(members.data ?? []).map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.user.name}
                </option>
              ))}
            </select>
          )}
          <Button variant="outline" size="sm" onClick={() => setOffset((o) => o - 1)} aria-label="Semana anterior">
            <ChevronLeft className="size-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setOffset(0)} disabled={offset === 0}>
            Esta semana
          </Button>
          <Button variant="outline" size="sm" onClick={() => setOffset((o) => o + 1)} aria-label="Próxima semana">
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </header>

      <p className="text-sm text-muted-foreground">
        {dayLabel(week.from)} a {dayLabel(week.to)}
      </p>

      {agenda.isLoading && <LoadingState />}
      {agenda.isError && <p className="text-sm text-destructive">{getErrorMessage(agenda.error, 'Não foi possível carregar a agenda.')}</p>}
      {agenda.data && days.length === 0 && (
        <EmptyState
          icon={CalendarDays}
          title="Nada marcado nesta semana"
          description="Marque um retorno pela conversa do cliente, no botão de agenda do topo."
        />
      )}

      {days.map((day) => (
        <section key={day} className="space-y-2">
          <h2 className="text-sm font-semibold capitalize">
            {dayLabel(day)}
            {day === today && <span className="ml-2 text-xs font-normal text-primary">hoje</span>}
          </h2>
          <ul className="space-y-2">
            {byDay.get(day)!.map((item) => (
              <AppointmentItem key={item.id} item={item} showOwner={isManager && !ownerUserId} onReschedule={setRescheduling} />
            ))}
          </ul>
        </section>
      ))}

      <ScheduleCallbackDialog
        open={!!rescheduling}
        onClose={() => setRescheduling(null)}
        rescheduleId={rescheduling?.id}
        ownerUserId={isManager ? rescheduling?.ownerUserId : undefined}
        ownerName={isManager ? rescheduling?.owner.name : undefined}
        contactName={rescheduling?.contact.name}
      />
    </div>
  );
}
