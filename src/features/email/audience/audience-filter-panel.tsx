'use client';

import { AlertCircle, AlertTriangle, Loader2, Users } from 'lucide-react';
import { CATEGORY_NOT_PARK_NOTICE } from './audience-categories';
import { CategoryChips } from './category-chips';
import { SupplierChipsInput } from './supplier-chips-input';
import { TagFilterChips } from './tag-filter-chips';
import { isAudienceFilterEmpty } from './audience-filter.util';
import type { UseCampaignAudienceResult } from './use-campaign-audience';
import { Button } from '@/components/ui/button';
import { controlCls } from '@/components/ui/control';
import { cn } from '@/lib/utils';

const fieldCls = cn(controlCls, 'w-full');
const labelCls = 'block text-xs font-medium text-foreground';

type AudienceFilterPanelProps = {
  audience: UseCampaignAudienceResult;
};

/**
 * Painel de segmentação da campanha, visível só em rascunho. A contagem
 * some enquanto o operador mexe nos critérios — nunca só no fim, porque é
 * exatamente durante a montagem do filtro que um "E" vira "OU" na cabeça
 * de alguém e o público sai bem diferente do esperado.
 */
export function AudienceFilterPanel({ audience }: AudienceFilterPanelProps) {
  const { formState, setFormState, currentFilter, dirty, countQ, saveMutation } = audience;
  const isEmpty = isAudienceFilterEmpty(currentFilter);
  const count = countQ.data?.count;

  return (
    <div className="space-y-4 rounded-xl border border-border bg-card p-4 shadow-soft">
      <div>
        <h2 className="text-sm font-semibold text-foreground">
          Público desta campanha
        </h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Sem nenhum critério abaixo, o email vai para todos os inscritos ativos.
        </p>
      </div>

      <div className="space-y-1.5">
        <span className={labelCls}>Etiquetas</span>
        <TagFilterChips
          selectedIds={formState.tagIds}
          onChange={(tagIds) => setFormState((s) => ({ ...s, tagIds }))}
          emptyLabel="Nenhuma etiqueta cadastrada — crie em Configurações › Etiquetas."
        />
      </div>

      <div className="space-y-1.5">
        <span className={labelCls}>Categoria comprada</span>
        <CategoryChips
          selected={formState.categories}
          onChange={(categories) => setFormState((s) => ({ ...s, categories }))}
        />
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          {CATEGORY_NOT_PARK_NOTICE}
        </p>
      </div>

      <div className="space-y-1.5">
        <span className={labelCls}>Fornecedor</span>
        <SupplierChipsInput
          value={formState.suppliers}
          onChange={(suppliers) => setFormState((s) => ({ ...s, suppliers }))}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="audience-purchased-since" className={labelCls}>
            Comprou a partir de
          </label>
          <input
            id="audience-purchased-since"
            type="date"
            value={formState.purchasedSince}
            onChange={(e) => setFormState((s) => ({ ...s, purchasedSince: e.target.value }))}
            className={fieldCls}
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="audience-purchased-until" className={labelCls}>
            Até
          </label>
          <input
            id="audience-purchased-until"
            type="date"
            value={formState.purchasedUntil}
            onChange={(e) => setFormState((s) => ({ ...s, purchasedUntil: e.target.value }))}
            className={fieldCls}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="audience-min-spent" className={labelCls}>
            Gastou pelo menos (R$)
          </label>
          <input
            id="audience-min-spent"
            type="number"
            min={0}
            step="0.01"
            inputMode="decimal"
            value={formState.minSpent}
            onChange={(e) => setFormState((s) => ({ ...s, minSpent: e.target.value }))}
            placeholder="0,00"
            className={fieldCls}
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="audience-min-orders" className={labelCls}>
            Fez pelo menos (pedidos)
          </label>
          <input
            id="audience-min-orders"
            type="number"
            min={0}
            step="1"
            inputMode="numeric"
            value={formState.minOrders}
            onChange={(e) => setFormState((s) => ({ ...s, minOrders: e.target.value }))}
            placeholder="0"
            className={fieldCls}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
        <div className="flex items-center gap-2 text-sm" aria-live="polite">
          <Users aria-hidden="true" className="h-4 w-4 shrink-0 text-muted-foreground" />
          {countQ.isLoading && !countQ.data ? (
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Contando…
            </span>
          ) : countQ.isError ? (
            <span role="alert" className="text-urgent-ink">Não foi possível contar o público.</span>
          ) : (
            <span className="text-foreground">
              {isEmpty ? 'Sem filtro, esta campanha vai para ' : 'Esta campanha vai para '}
              <strong className="font-mono font-semibold tabular-nums text-foreground">
                {count != null ? `${count.toLocaleString('pt-BR')} pessoas` : '—'}
              </strong>
              {countQ.isFetching && count != null && (
                <Loader2 className="ml-1.5 inline h-3 w-3 animate-spin text-muted-foreground" />
              )}
            </span>
          )}
        </div>

        {dirty && (
          <Button type="button" onClick={() => saveMutation.mutate()} loading={saveMutation.isPending}>
            {saveMutation.isPending ? 'Salvando…' : 'Salvar público'}
          </Button>
        )}
      </div>

      {dirty && !saveMutation.isPending && (
        <div className="flex items-start gap-2 rounded-lg bg-warning-wash px-3 py-2 text-xs text-warning-ink">
          <AlertTriangle aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            Há alterações no filtro que ainda não foram salvas. Salve o público antes de disparar,
            para não enviar para a segmentação anterior.
          </span>
        </div>
      )}

      {saveMutation.isError && (
        <p role="alert" className="flex items-center gap-1.5 text-xs text-urgent-ink">
          <AlertCircle aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
          Não foi possível salvar o filtro de público. Tente novamente.
        </p>
      )}
    </div>
  );
}
