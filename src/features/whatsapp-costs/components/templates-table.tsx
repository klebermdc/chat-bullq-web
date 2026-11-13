import { Lightbulb } from 'lucide-react';
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
import { categoryShortLabel, isMarketingCategory } from '../lib/labels';
import { hasMarketingTemplates, marketingHint, sortTemplates } from '../lib/selectors';
import type { TemplateRow } from '../services/whatsapp-costs.service';
import { SectionCard } from './section-parts';

const COLUMN_COUNT = 4;
const fromSm = 'hidden sm:table-cell';

function CategoryBadge({ category }: { category: string | null }) {
  if (!category) return <span className="text-muted-foreground">—</span>;
  return (
    <Badge variant={isMarketingCategory(category) ? 'hot' : 'neutral'}>{categoryShortLabel(category)}</Badge>
  );
}

function MarketingHint({ ratio }: { ratio: number | null }) {
  return (
    <p className="flex items-start gap-2 border-t border-border bg-warning-wash px-4 py-3 text-xs text-warning-ink">
      <Lightbulb aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
      <span className="min-w-0">{marketingHint(ratio)}</span>
    </p>
  );
}

export function TemplatesTable({
  templates,
  currency,
  marketingRatio,
}: {
  templates: ReadonlyArray<TemplateRow>;
  currency: string;
  /** Quantas respostas custa um template de marketing; null sem preço. */
  marketingRatio: number | null;
}) {
  const sorted = sortTemplates(templates);
  return (
    <SectionCard flush title="Templates" subtitle="Mensagens prontas enviadas no período">
      <table aria-label="Envios e custo por template" className={tableCls}>
        <thead className={theadCls}>
          <tr>
            <th scope="col" className={thCls}>Template</th>
            <th scope="col" className={cn(thCls, fromSm)}>Categoria</th>
            <th scope="col" className={thNumCls}>Envios</th>
            <th scope="col" className={thNumCls}>Custo</th>
          </tr>
        </thead>
        <tbody className={tbodyCls}>
          {sorted.length === 0 && <EmptyRow colSpan={COLUMN_COUNT}>Nenhum template enviado no período.</EmptyRow>}
          {sorted.map((template) => {
            const isMarketing = isMarketingCategory(template.category);
            return (
              <tr key={template.name} className={cn(trCls, isMarketing && 'bg-warning-wash/40')}>
                <td className={tdBaseCls}>
                  <span className="block break-all font-mono text-xs">{template.name}</span>
                  <span className="mt-1 block sm:hidden">
                    <CategoryBadge category={template.category} />
                  </span>
                </td>
                <td className={cn(tdBaseCls, fromSm)}>
                  <CategoryBadge category={template.category} />
                </td>
                <td className={tdNumCls}>{formatCount(template.sent)}</td>
                <td className={tdNumCls}>{formatCost(template.cost, currency)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {hasMarketingTemplates(templates) && <MarketingHint ratio={marketingRatio} />}
    </SectionCard>
  );
}
