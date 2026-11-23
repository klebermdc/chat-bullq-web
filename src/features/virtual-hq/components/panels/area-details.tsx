'use client';

import Link from 'next/link';
import type { Areas, VirtualHqSnapshot } from '../../api';
import { formatDay, waitedLabel } from '../../lib/labels';
import type { AreaId } from '../../lib/world/types';
import { Notice, num, Stat, StatGrid } from './stat';

const NOT_INTEGRATED = 'Ainda não integrado.';
const MANAGERS_ONLY = 'Só a gestão vê esta área.';

function Meeting({ agency }: { agency: Areas['agency'] | undefined }) {
  if (!agency) return <Notice>{NOT_INTEGRATED}</Notice>;
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">A agência inteira hoje.</p>
      <StatGrid>
        <Stat label="Conversas abertas" value={num(agency.openTotal)} />
        <Stat label="Esperando resposta" value={num(agency.awaitingReply)} />
        <Stat label="Recebidas hoje" value={num(agency.assignedToday)} />
        <Stat label="Finalizadas hoje" value={num(agency.closedToday)} />
      </StatGrid>
    </div>
  );
}

function PosVenda({ data }: { data: NonNullable<Areas['posVenda']> }) {
  const next = data.next ?? [];
  return (
    <div className="space-y-3">
      <StatGrid>
        <Stat label="Ingressos pendentes" value={num(data.ticketsPending)} />
      </StatGrid>
      <section className="space-y-2">
        <h3 className="text-sm font-semibold">Próximos guiamentos</h3>
        {next.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nada marcado.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {next.map((n) => (
              <li key={`${n.contractId}-${n.date}-${n.parkLabel}`} className="flex gap-2">
                <span className="w-11 shrink-0 tabular-nums text-muted-foreground">{formatDay(n.date)}</span>
                <span className="min-w-0 flex-1 truncate">
                  {n.parkLabel} · {n.clientName}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">{n.guideName}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Marketing({ data }: { data: NonNullable<Areas['marketing']> }) {
  const channels = data.byChannel ?? [];
  return (
    <div className="space-y-3">
      <StatGrid>
        <Stat label="Leads hoje" value={num(data.leadsToday)} />
      </StatGrid>
      {channels.length > 0 && (
        <ul className="space-y-1 text-sm">
          {channels.map((c) => (
            <li key={c.channel} className="flex justify-between gap-2">
              <span className="truncate">{c.channel}</span>
              <span className="tabular-nums text-muted-foreground">{num(c.count)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Painel de uma área fixa. Área sem dado mostra aviso, nunca número inventado. */
export function AreaDetails({ areaId, snapshot }: { areaId: AreaId; snapshot: VirtualHqSnapshot }) {
  const areas = snapshot.areas;
  if (areas === null) return <Notice>{MANAGERS_ONLY}</Notice>;
  if (!areas) return <Notice>{NOT_INTEGRATED}</Notice>;
  switch (areaId) {
    case 'reuniao':
      return <Meeting agency={areas.agency} />;
    case 'posVenda':
      return areas.posVenda ? <PosVenda data={areas.posVenda} /> : <Notice>{NOT_INTEGRATED}</Notice>;
    case 'marketing':
      return areas.marketing ? <Marketing data={areas.marketing} /> : <Notice>{NOT_INTEGRATED}</Notice>;
    case 'financeiro':
      return areas.financeiro ? (
        <StatGrid>
          <Stat label="Pagamentos em aberto" value={num(areas.financeiro.unpaid)} />
          <Stat label="Notas a emitir" value={num(areas.financeiro.invoicesPending)} />
        </StatGrid>
      ) : (
        <Notice>{NOT_INTEGRATED}</Notice>
      );
    case 'iaCentral':
      return areas.iaCentral ? (
        <StatGrid>
          <Stat label="Com a IA agora" value={num(areas.iaCentral.withAi)} />
          <Stat label="Passadas a humano hoje" value={num(areas.iaCentral.handedOffToday)} />
        </StatGrid>
      ) : (
        <Notice>{NOT_INTEGRATED}</Notice>
      );
  }
}

export function ReceptionDetails({ snapshot, now }: { snapshot: VirtualHqSnapshot; now: Date }) {
  const reception = snapshot.reception;
  if (!reception) return <Notice>{MANAGERS_ONLY}</Notice>;
  const waited = waitedLabel(reception.oldestSince, now);
  return (
    <div className="space-y-4">
      <StatGrid>
        <Stat label="Sem dono agora" value={num(reception.unassigned)} />
        <Stat label="Entraram hoje" value={num(reception.enteredToday)} />
      </StatGrid>
      {waited && <p className="text-sm text-muted-foreground">O mais antigo sem dono espera há {waited}.</p>}
      <Link href="/inbox" className="text-sm font-medium text-primary underline-offset-4 hover:underline">
        Abrir a caixa de entrada
      </Link>
    </div>
  );
}
