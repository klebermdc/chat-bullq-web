import { Banknote, Briefcase, Percent, Receipt, Trophy, XCircle } from 'lucide-react';
import type { DealsReport } from '../services/crm-reports.service';
import { StatCard } from '@/components/ui/stat-card';

const brl = (n: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(n);

export function DealsMetrics({ m }: { m: DealsReport['metrics'] }) {
  // Seis cartões com valor em reais: três por linha (duas linhas alinhadas).
  // Seis numa linha só não cabem no tamanho padrão do cartão.
  return (
    <div className="grid grid-cols-1 items-stretch gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
      <StatCard label="Negócios" value={m.count.toLocaleString('pt-BR')} icon={Briefcase} />
      <StatCard label="Valor total" value={brl(m.totalValue)} icon={Banknote} />
      <StatCard label="Ganhos" value={m.won.count.toLocaleString('pt-BR')} hint={brl(m.won.value)} icon={Trophy} />
      <StatCard label="Perdidos" value={m.lost.count.toLocaleString('pt-BR')} hint={brl(m.lost.value)} icon={XCircle} />
      <StatCard label="Conversão" value={`${Math.round(m.conversionRate * 100)}%`} icon={Percent} />
      <StatCard label="Ticket médio" value={brl(m.avgWonTicket)} icon={Receipt} />
    </div>
  );
}
