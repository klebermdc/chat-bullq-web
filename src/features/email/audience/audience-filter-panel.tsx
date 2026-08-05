'use client';

import { AlertTriangle, Loader2, Users } from 'lucide-react';
import { CATEGORY_NOT_PARK_NOTICE } from './audience-categories';
import { CategoryChips } from './category-chips';
import { SupplierChipsInput } from './supplier-chips-input';
import { TagFilterChips } from './tag-filter-chips';
import { isAudienceFilterEmpty } from './audience-filter.util';
import type { UseCampaignAudienceResult } from './use-campaign-audience';

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
    <div className="space-y-4 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div>
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Público desta campanha
        </h2>
        <p className="mt-0.5 text-xs text-zinc-500">
          Sem nenhum critério abaixo, o email vai para todos os inscritos ativos.
        </p>
      </div>

      <div className="space-y-1.5">
        <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">Etiquetas</span>
        <TagFilterChips
          selectedIds={formState.tagIds}
          onChange={(tagIds) => setFormState((s) => ({ ...s, tagIds }))}
          emptyLabel="Nenhuma etiqueta cadastrada — crie em Configurações › Etiquetas."
        />
      </div>

      <div className="space-y-1.5">
        <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">Categoria comprada</span>
        <CategoryChips
          selected={formState.categories}
          onChange={(categories) => setFormState((s) => ({ ...s, categories }))}
        />
        <p className="text-[11px] leading-relaxed text-zinc-400 dark:text-zinc-500">
          {CATEGORY_NOT_PARK_NOTICE}
        </p>
      </div>

      <div className="space-y-1.5">
        <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">Fornecedor</span>
        <SupplierChipsInput
          value={formState.suppliers}
          onChange={(suppliers) => setFormState((s) => ({ ...s, suppliers }))}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="audience-purchased-since" className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
            Comprou a partir de
          </label>
          <input
            id="audience-purchased-since"
            type="date"
            value={formState.purchasedSince}
            onChange={(e) => setFormState((s) => ({ ...s, purchasedSince: e.target.value }))}
            className="h-9 w-full rounded-md border border-zinc-300 bg-white px-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="audience-purchased-until" className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
            Até
          </label>
          <input
            id="audience-purchased-until"
            type="date"
            value={formState.purchasedUntil}
            onChange={(e) => setFormState((s) => ({ ...s, purchasedUntil: e.target.value }))}
            className="h-9 w-full rounded-md border border-zinc-300 bg-white px-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="audience-min-spent" className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
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
            className="h-9 w-full rounded-md border border-zinc-300 bg-white px-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="audience-min-orders" className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
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
            className="h-9 w-full rounded-md border border-zinc-300 bg-white px-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100 pt-3 dark:border-zinc-800">
        <div className="flex items-center gap-2 text-sm">
          <Users className="h-4 w-4 text-zinc-400" />
          {countQ.isLoading && !countQ.data ? (
            <span className="inline-flex items-center gap-1.5 text-zinc-500">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Contando…
            </span>
          ) : countQ.isError ? (
            <span className="text-red-600 dark:text-red-400">Não foi possível contar o público.</span>
          ) : (
            <span className="text-zinc-700 dark:text-zinc-200">
              {isEmpty ? 'Sem filtro, esta campanha vai para ' : 'Esta campanha vai para '}
              <strong className="font-semibold text-zinc-900 dark:text-zinc-50">
                {count != null ? `${count.toLocaleString('pt-BR')} pessoas` : '—'}
              </strong>
              {countQ.isFetching && count != null && (
                <Loader2 className="ml-1.5 inline h-3 w-3 animate-spin text-zinc-400" />
              )}
            </span>
          )}
        </div>

        {dirty && (
          <button
            type="button"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {saveMutation.isPending ? 'Salvando…' : 'Salvar público'}
          </button>
        )}
      </div>

      {dirty && !saveMutation.isPending && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            Há alterações no filtro que ainda não foram salvas. Salve o público antes de disparar,
            para não enviar para a segmentação anterior.
          </span>
        </div>
      )}

      {saveMutation.isError && (
        <p className="text-xs text-red-600 dark:text-red-400">
          Não foi possível salvar o filtro de público. Tente novamente.
        </p>
      )}
    </div>
  );
}
