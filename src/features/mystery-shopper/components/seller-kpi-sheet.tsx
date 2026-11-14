import type { SellerKpi } from '../api';
import { formatMinutes, formatPct } from '../kpis';

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-mono text-sm tabular-nums">{value}</dd>
    </div>
  );
}

/** Ficha do vendedor: o que se repete nas visitas do mês. */
export function SellerKpiSheet({ seller }: { seller: SellerKpi }) {
  return (
    <div className="space-y-3 whitespace-normal">
      <dl className="flex flex-wrap gap-x-8 gap-y-2">
        <Fact label="1ª resposta (mediana)" value={formatMinutes(seller.medianFirstReplyMinutes)} />
        <Fact label="Com cotação" value={formatPct(seller.proposalPct)} />
        <Fact label="Com follow-up" value={formatPct(seller.followUpPct)} />
      </dl>
      <div>
        <p className="mb-1 text-xs text-muted-foreground">Pontos a melhorar que se repetem</p>
        {seller.topImprovements.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nada se repetiu neste mês.</p>
        ) : (
          <ul className="list-disc space-y-0.5 pl-5 text-sm">
            {seller.topImprovements.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
