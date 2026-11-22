import { cn } from '@/lib/utils';
import {
  COMPETITOR_ESTIMATE_NOTE,
  COMPETITOR_SKIP_TEXT,
  COMPETITOR_STALE_NOTE,
  COMPETITOR_STATUS_TEXT,
  competitorOfferTone,
  competitorStoreName,
  formatCompetitorDiff,
  hasCompetitorEstimates,
  type CompetitorTone,
} from '../../lib/competitor-compare';
import { formatQuoteMoney, formatTimeHM } from '../../lib/quote-format';
import type { CompetitorComparison, CompetitorItemResult, CompetitorOffer } from '../../types';

const TONE_CLASS: Record<CompetitorTone, string> = {
  theyCheaper: 'border-warning-ink/30 bg-warning-wash text-warning-ink',
  weCheaper: 'border-success-ink/30 bg-success-wash text-success-ink',
  theyCheaperEstimate: 'border-dashed border-warning-ink/30 bg-warning-wash/40 text-warning-ink',
  weCheaperEstimate: 'border-dashed border-success-ink/30 bg-success-wash/40 text-success-ink',
  neutral: 'border-border bg-background text-foreground',
};

interface OfferRowProps {
  offer: CompetitorOffer;
  storeName: string;
  currency: string;
}

/** Uma loja: nome à esquerda, valor e diferença à direita (cabe no modal estreito). */
function OfferRow({ offer, storeName, currency }: OfferRowProps) {
  const tone = competitorOfferTone(offer);
  const isOk = offer.status === 'OK';
  const total = isOk ? formatQuoteMoney(offer.total, currency) : null;
  const cash = isOk ? formatQuoteMoney(offer.cashTotal, currency) : null;
  const diff = formatCompetitorDiff(offer, currency);
  return (
    <li className={cn('flex items-start justify-between gap-3 rounded-md border px-2.5 py-1.5 text-xs', TONE_CLASS[tone])}>
      <span className="min-w-0 break-words font-medium">
        {storeName}
        {offer.isEstimate && isOk && (
          <span className="mt-0.5 block w-fit rounded border border-current/30 px-1 text-[10px] font-normal uppercase tracking-wide opacity-80">
            estimado
          </span>
        )}
      </span>
      <span className="shrink-0 text-right">
        {offer.status === 'OK' ? (
          <>
            <span className="block font-semibold tabular-nums">
              {offer.isEstimate && <span className="font-normal">a partir de </span>}
              {total ?? '—'}
            </span>
            {diff && <span className="block tabular-nums">{diff}</span>}
            {(cash || offer.maxInstallments) && (
              <span className="block text-[11px] opacity-80 tabular-nums">
                {[cash && `Pix ${cash}`, offer.maxInstallments && `até ${offer.maxInstallments}x`].filter(Boolean).join(' · ')}
              </span>
            )}
          </>
        ) : (
          <span className="text-muted-foreground">{COMPETITOR_STATUS_TEXT[offer.status]}</span>
        )}
      </span>
    </li>
  );
}

interface ItemProps {
  item: CompetitorItemResult;
  result: CompetitorComparison;
  currency: string;
}

function ItemResult({ item, result, currency }: ItemProps) {
  return (
    <li className="space-y-1.5">
      <div>
        <p className="text-xs font-semibold text-foreground">
          Item {item.index + 1}: {item.title || 'sem nome'}
        </p>
        <p className="text-[11px] text-muted-foreground tabular-nums">
          Nosso total: {formatQuoteMoney(item.ourTotal, currency) ?? '—'}
          {item.match && ` · Comparado: ${item.match.name}`}
        </p>
      </div>
      {item.reason ? (
        <p className="rounded-md bg-muted px-2.5 py-1.5 text-xs text-muted-foreground">{COMPETITOR_SKIP_TEXT[item.reason]}</p>
      ) : (
        <ul className="space-y-1" aria-label={`Lojas para o item ${item.index + 1}`}>
          {item.offers.map((offer) => (
            <OfferRow key={offer.storeId} offer={offer} storeName={competitorStoreName(result, offer.storeId)} currency={currency} />
          ))}
        </ul>
      )}
    </li>
  );
}

interface Props {
  result: CompetitorComparison;
  currency: string;
  isStale: boolean;
}

/** Resultado da última comparação. Fica na tela mesmo com os itens alterados (com aviso). */
export function QuoteCompetitorResults({ result, currency, isStale }: Props) {
  const checkedAt = formatTimeHM(result.checkedAt);
  return (
    <div className="space-y-2.5">
      {isStale && <p className="text-xs italic text-muted-foreground">{COMPETITOR_STALE_NOTE}</p>}
      {result.summary.length > 0 && (
        <div aria-live="polite" className="space-y-0.5 rounded-md bg-muted px-2.5 py-2 text-xs text-foreground">
          {result.summary.map((line, i) => (
            <p key={i}>{line}</p>
          ))}
        </div>
      )}
      <ul className="space-y-3">
        {result.items.map((item) => (
          <ItemResult key={item.index} item={item} result={result} currency={currency} />
        ))}
      </ul>
      <div className="space-y-0.5 text-[11px] text-muted-foreground">
        {hasCompetitorEstimates(result) && <p>{COMPETITOR_ESTIMATE_NOTE}</p>}
        {checkedAt && <p>Consultado às {checkedAt}</p>}
      </div>
    </div>
  );
}
