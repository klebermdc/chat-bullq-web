'use client';

import { useState, type FormEvent, type KeyboardEvent } from 'react';
import { ExternalLink, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { getErrorMessage } from '@/lib/errors';
import { useIsOrgManager } from '@/lib/permissions';
import type { OperatorRate } from '../service';
import { useSetManualRate } from '../use-exchange-rates';
import { formatRate, parseRateInput, rateTitle } from '../lib/format';

export const CARD_CLS =
  'flex h-full flex-col items-center rounded-xl border border-border bg-card px-3 py-3 text-center shadow-sm';

/** Cartão da operadora sem busca automática (AZ): ADM/Owner lança o valor. */
export function ManualRateCard({ rate }: { rate: OperatorRate }) {
  const canEdit = useIsOrgManager();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const mutation = useSetManualRate();

  const startEdit = () => {
    setDraft(rate.value !== null ? formatRate(rate.value) : '');
    setEditing(true);
  };

  const save = (e: FormEvent) => {
    e.preventDefault();
    const value = parseRateInput(draft);
    if (value === null) {
      toast.error('Digite o câmbio em reais, por exemplo 5,88');
      return;
    }
    mutation.mutate(
      { code: rate.code, value },
      {
        onSuccess: () => {
          setEditing(false);
          toast.success(`Câmbio ${rate.code} salvo: R$ ${formatRate(value)}`);
        },
        onError: (err) => toast.error(getErrorMessage(err, 'Não foi possível salvar o câmbio')),
      },
    );
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') setEditing(false);
  };

  if (editing) {
    return (
      <form onSubmit={save} className={CARD_CLS}>
        <label htmlFor={`cambio-${rate.code}`} className="text-xs font-semibold text-muted-foreground">
          {rate.code} · R$ por US$ 1
        </label>
        <input
          id={`cambio-${rate.code}`}
          autoFocus
          inputMode="decimal"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="5,88"
          className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1 text-center text-lg font-semibold tabular-nums text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
        <div className="mt-2 flex gap-3 text-xs">
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="text-muted-foreground hover:text-foreground"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="font-semibold text-primary disabled:opacity-50"
          >
            {mutation.isPending ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </form>
    );
  }

  return (
    <div title={rateTitle(rate)} className={cn(CARD_CLS, rate.stale && 'opacity-60')}>
      <span className="text-xs font-semibold text-muted-foreground">{rate.code}</span>
      {rate.value !== null ? (
        <span className="mt-1 text-xl font-semibold tabular-nums text-foreground">
          R$ {formatRate(rate.value)}
        </span>
      ) : (
        <span className="mt-1 text-sm font-medium text-muted-foreground">sem câmbio hoje</span>
      )}
      <span className="mt-0.5 max-w-full truncate text-[11px] text-muted-foreground">
        {rate.name}
      </span>
      <div className="mt-1.5 flex items-center gap-3 text-[11px] font-medium">
        <a
          href={rate.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-0.5 text-primary hover:underline"
        >
          site <ExternalLink aria-hidden="true" className="size-3" />
        </a>
        {canEdit && (
          <button
            type="button"
            onClick={startEdit}
            className="flex items-center gap-0.5 text-primary hover:underline"
          >
            <Pencil aria-hidden="true" className="size-3" />
            {rate.value !== null ? 'editar' : 'lançar'}
          </button>
        )}
      </div>
    </div>
  );
}
