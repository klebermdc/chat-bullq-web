'use client';
import type { Facets, ReportFilters, Vendedor } from '../services/sales-reports.service';

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export function ReportFilterBar({
  filters, onChange, facets, vendedores, isAdmin,
}: {
  filters: ReportFilters;
  onChange: (next: ReportFilters) => void;
  facets?: Facets;
  vendedores?: Vendedor[];
  isAdmin: boolean;
}) {
  const set = (patch: Partial<ReportFilters>) => onChange({ ...filters, ...patch });
  const cls = 'rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900';
  const hasAny = !!(filters.vendedor || filters.year || filters.month || filters.status || filters.produto || filters.fornecedor || filters.search);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        value={filters.search ?? ''}
        onChange={(e) => set({ search: e.target.value || undefined })}
        placeholder="Buscar cliente, pedido, telefone…"
        className={`${cls} min-w-[220px] flex-1`}
      />
      {isAdmin && (
        <select value={filters.vendedor ?? ''} onChange={(e) => set({ vendedor: e.target.value || undefined })} className={cls}>
          <option value="">Todos os vendedores</option>
          {vendedores?.map((v) => <option key={v.email || v.nome} value={v.nome}>{v.nome}</option>)}
        </select>
      )}
      <select value={filters.year ?? ''} onChange={(e) => set({ year: e.target.value ? Number(e.target.value) : undefined })} className={cls}>
        <option value="">Ano</option>
        {facets?.anos.map((a) => <option key={a} value={a}>{a}</option>)}
      </select>
      <select value={filters.month ?? ''} onChange={(e) => set({ month: e.target.value ? Number(e.target.value) : undefined })} className={cls}>
        <option value="">Mês</option>
        {facets?.meses.map((m) => <option key={m} value={m}>{MESES[m - 1]}</option>)}
      </select>
      <select value={filters.status ?? ''} onChange={(e) => set({ status: e.target.value || undefined })} className={cls}>
        <option value="">Status</option>
        {facets?.statuses.map((s) => <option key={s} value={s}>{s}</option>)}
      </select>
      <select value={filters.produto ?? ''} onChange={(e) => set({ produto: e.target.value || undefined })} className={cls}>
        <option value="">Produto</option>
        {facets?.produtos.map((p) => <option key={p} value={p}>{p}</option>)}
      </select>
      <select value={filters.fornecedor ?? ''} onChange={(e) => set({ fornecedor: e.target.value || undefined })} className={cls}>
        <option value="">Fornecedor</option>
        {facets?.fornecedores.map((f) => <option key={f} value={f}>{f}</option>)}
      </select>
      {hasAny && (
        <button onClick={() => onChange({})} className="rounded-lg px-3 py-2 text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200">
          Limpar filtros
        </button>
      )}
    </div>
  );
}
