import { Badge, type BadgeProps } from '@/components/ui/badge';
import type { LeadsReport } from '../services/crm-reports.service';
import {
  EmptyRow, Pager, TableCard, YesMark, formatDate,
  tbodyCls, tdBaseCls, tdCls, tdMutedCls, tdTruncateCls, thCls, theadCls, trCls,
} from './table-parts';

const MAX_VISIBLE_TAGS = 3;
const COLUMN_COUNT = 9;

const TEMPERATURE: Record<number, { label: string; variant: BadgeProps['variant'] }> = {
  1: { label: 'Frio', variant: 'info' },
  2: { label: 'Morno', variant: 'neutral' },
  3: { label: 'Quente', variant: 'hot' },
};

function Temperature({ value }: { value: number | null }) {
  const meta = value ? TEMPERATURE[value] : undefined;
  if (!meta) return <span className="text-muted-foreground">—</span>;
  return <Badge variant={meta.variant}>{meta.label}</Badge>;
}

export function LeadsTable({
  report,
  onPage,
}: {
  report: LeadsReport;
  onPage: (page: number) => void;
}) {
  return (
    <TableCard
      label="Leads do período"
      minWidth="min-w-[1040px]"
      footer={
        <Pager
          page={report.page}
          totalPages={report.totalPages}
          total={report.total}
          noun="leads"
          onPage={onPage}
        />
      }
    >
      <thead className={theadCls}>
        <tr>
          <th scope="col" className={thCls}>Nome</th>
          <th scope="col" className={thCls}>Telefone</th>
          <th scope="col" className={thCls}>Canal</th>
          <th scope="col" className={thCls}>Atendente</th>
          <th scope="col" className={thCls}>Tags</th>
          <th scope="col" className={thCls}>Proposta</th>
          <th scope="col" className={thCls}>Negócio</th>
          <th scope="col" className={thCls}>Temperatura</th>
          <th scope="col" className={thCls}>Criado</th>
        </tr>
      </thead>
      <tbody className={tbodyCls}>
        {report.rows.map((r) => (
          <tr key={r.id} className={trCls}>
            <td className={`${tdTruncateCls} w-[20%] font-medium`} title={r.name || r.phone || undefined}>
              {/* Contato sem nome: o telefone identifica melhor que um traço. */}
              {r.name || (
                r.phone
                  ? <span className="font-mono font-normal tabular-nums text-muted-foreground">{r.phone}</span>
                  : '—'
              )}
            </td>
            <td className={`${tdCls} font-mono tabular-nums`}>{r.phone ?? '—'}</td>
            <td className={`${tdTruncateCls} w-[14%]`} title={r.channelName ?? undefined}>
              {r.channelName ?? '—'}
            </td>
            <td className={`${tdTruncateCls} w-[14%]`} title={r.assignedToName ?? undefined}>
              {r.assignedToName ?? '—'}
            </td>
            <td className={`${tdBaseCls} w-[22%]`}>
              {/* A API devolve só o nome da tag, sem a cor: selo neutro em vez
                  de pintar com uma cor que não é a dela. */}
              <div className="flex flex-wrap items-center gap-1">
                {r.tags.slice(0, MAX_VISIBLE_TAGS).map((t) => (
                  <Badge key={t} variant="neutral" title={t} className="max-w-[140px] font-medium">
                    <span className="truncate py-px">{t}</span>
                  </Badge>
                ))}
                {r.tags.length > MAX_VISIBLE_TAGS && (
                  <span
                    className="text-[11px] text-muted-foreground"
                    title={r.tags.slice(MAX_VISIBLE_TAGS).join(', ')}
                  >
                    +{r.tags.length - MAX_VISIBLE_TAGS}
                  </span>
                )}
              </div>
            </td>
            <td className={tdCls}><YesMark value={r.hasProposal} /></td>
            <td className={tdCls}><YesMark value={r.hasDeal} /></td>
            <td className={tdCls}><Temperature value={r.temperature} /></td>
            <td className={`${tdMutedCls} font-mono tabular-nums`}>{formatDate(r.createdAt)}</td>
          </tr>
        ))}
        {report.rows.length === 0 && (
          <EmptyRow colSpan={COLUMN_COUNT}>Nenhum lead com esses filtros.</EmptyRow>
        )}
      </tbody>
    </TableCard>
  );
}
