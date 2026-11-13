import { Badge } from '@/components/ui/badge';
import {
  EmptyRow,
  tableCls,
  tbodyCls,
  tdBaseCls,
  tdNumCls,
  thCls,
  theadCls,
  thNumCls,
  trCls,
} from '@/features/crm-reports/components/table-parts';
import { cn } from '@/lib/utils';
import { formatCost, formatCount } from '../lib/format';
import { senderKindLabel } from '../lib/labels';
import { sortSenders } from '../lib/selectors';
import type { SenderRow } from '../services/whatsapp-costs.service';
import { SectionCard } from './section-parts';

const COLUMN_COUNT = 6;
// No celular ficam Nome e Custo; o detalhe vai numa linha embaixo do nome.
const fromSm = 'hidden sm:table-cell';
const fromMd = 'hidden md:table-cell';

function MobileDetail({ sender }: { sender: SenderRow }) {
  return (
    <span className="mt-0.5 block text-xs text-muted-foreground sm:hidden">
      {formatCount(sender.service)} respostas · {formatCount(sender.marketing)} marketing
      {sender.utility > 0 && ` · ${formatCount(sender.utility)} utilidade`}
    </span>
  );
}

export function SendersTable({ senders, currency }: { senders: ReadonlyArray<SenderRow>; currency: string }) {
  const sorted = sortSenders(senders);
  return (
    <SectionCard flush title="Quem gera o custo" subtitle="Mensagens cobradas por vendedor, IA e envios automáticos">
      <table aria-label="Custo por quem enviou" className={tableCls}>
        <thead className={theadCls}>
          <tr>
            <th scope="col" className={thCls}>Quem</th>
            <th scope="col" className={cn(thNumCls, fromSm)}>Respostas</th>
            <th scope="col" className={cn(thNumCls, fromSm)}>Marketing</th>
            <th scope="col" className={cn(thNumCls, fromMd)}>Utilidade</th>
            <th scope="col" className={cn(thNumCls, fromMd)}>Conversas</th>
            <th scope="col" className={thNumCls}>Custo</th>
          </tr>
        </thead>
        <tbody className={tbodyCls}>
          {sorted.length === 0 && <EmptyRow colSpan={COLUMN_COUNT}>Ninguém enviou mensagem cobrada no período.</EmptyRow>}
          {sorted.map((sender) => (
            <tr key={`${sender.kind}|${sender.name}`} className={trCls}>
              <td className={cn(tdBaseCls, 'min-w-0')}>
                <span className="flex flex-wrap items-center gap-1.5">
                  <span className="break-words font-medium">{sender.name}</span>
                  {sender.kind !== 'agent' && <Badge>{senderKindLabel(sender.kind)}</Badge>}
                </span>
                <MobileDetail sender={sender} />
              </td>
              <td className={cn(tdNumCls, fromSm)}>{formatCount(sender.service)}</td>
              <td className={cn(tdNumCls, fromSm)}>{formatCount(sender.marketing)}</td>
              <td className={cn(tdNumCls, fromMd)}>{formatCount(sender.utility)}</td>
              <td className={cn(tdNumCls, fromMd)}>{formatCount(sender.conversations)}</td>
              <td className={tdNumCls}>{formatCost(sender.cost, currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </SectionCard>
  );
}
