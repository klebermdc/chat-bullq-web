'use client';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { controlSmCls } from '@/components/ui/control';
import { orderStatusMeta } from './order-format';
import type { Facets, ReportFilters, Vendedor } from '../services/sales-reports.service';

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

// Dois grupos: filtros à esquerda, "Limpar filtros" preso à primeira linha, à
// direita. Dentro do grupo a busca cresce e os seletores encolhem
// (`min-w-0`) antes de quebrar; cada um tem teto de largura para um nome
// longo de produto não empurrar os outros para a linha de baixo.
const selectCls = `${controlSmCls} min-w-0 flex-1`;
const selectShortCls = `${selectCls} basis-20 sm:max-w-[96px]`;
const selectWideCls = `${selectCls} basis-28 sm:max-w-[200px]`;

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
  const hasAny = !!(filters.vendedor || filters.year || filters.month || filters.status || filters.produto || filters.fornecedor || filters.search);
  return (
    <div className="flex flex-wrap items-start gap-2 rounded-xl border border-border bg-card p-3 shadow-soft sm:flex-nowrap">
      <div className="flex min-w-0 flex-1 basis-full flex-wrap items-center gap-2 sm:basis-0">
      <input
        value={filters.search ?? ''}
        onChange={(e) => set({ search: e.target.value || undefined })}
        placeholder="Buscar cliente, pedido, telefone…"
        aria-label="Buscar cliente, pedido ou telefone"
        className={`${controlSmCls} min-w-[180px] flex-[2_1_220px]`}
      />
      {isAdmin && (
        <select
          aria-label="Vendedor"
          value={filters.vendedor ?? ''}
          onChange={(e) => set({ vendedor: e.target.value || undefined })}
          className={selectWideCls}
        >
          <option value="">Todos os vendedores</option>
          {vendedores?.map((v) => <option key={v.email || v.nome} value={v.nome}>{v.nome}</option>)}
        </select>
      )}
      <select
        aria-label="Ano"
        value={filters.year ?? ''}
        onChange={(e) => set({ year: e.target.value ? Number(e.target.value) : undefined })}
        className={selectShortCls}
      >
        <option value="">Ano</option>
        {facets?.anos.map((a) => <option key={a} value={a}>{a}</option>)}
      </select>
      <select
        aria-label="Mês"
        value={filters.month ?? ''}
        onChange={(e) => set({ month: e.target.value ? Number(e.target.value) : undefined })}
        className={selectShortCls}
      >
        <option value="">Mês</option>
        {facets?.meses.map((m) => <option key={m} value={m}>{MESES[m - 1]}</option>)}
      </select>
      <select
        aria-label="Status"
        value={filters.status ?? ''}
        onChange={(e) => set({ status: e.target.value || undefined })}
        className={selectWideCls}
      >
        <option value="">Status</option>
        {facets?.statuses.map((s) => <option key={s} value={s}>{orderStatusMeta(s)?.label ?? s}</option>)}
      </select>
      <select
        aria-label="Produto"
        value={filters.produto ?? ''}
        onChange={(e) => set({ produto: e.target.value || undefined })}
        className={selectWideCls}
      >
        <option value="">Produto</option>
        {facets?.produtos.map((p) => <option key={p} value={p}>{p}</option>)}
      </select>
      <select
        aria-label="Fornecedor"
        value={filters.fornecedor ?? ''}
        onChange={(e) => set({ fornecedor: e.target.value || undefined })}
        className={selectWideCls}
      >
        <option value="">Fornecedor</option>
        {facets?.fornecedores.map((f) => <option key={f} value={f}>{f}</option>)}
      </select>
      </div>
      {hasAny && (
        <Button variant="outline" size="sm" className="ml-auto shrink-0" onClick={() => onChange({})}>
          <X aria-hidden="true" className="h-3.5 w-3.5" />
          Limpar filtros
        </Button>
      )}
    </div>
  );
}
