import { api } from '@/lib/api';

export interface SalesTotals {
  orders: number; venda: number; comissaoVendedor: number;
  comissaoTotal: number; comissaoGuia: number;
}
export interface SalesReport {
  scope: 'all' | 'seller';
  seller: string | null;
  filters: { month?: number; year?: number };
  totals: SalesTotals;
  byStatus: Array<{ status: string; count: number; venda: number; comissaoVendedor: number }>;
  byMonth: Array<{ month: string; count: number; venda: number; comissaoVendedor: number }>;
  byProduct: Array<{ produto: string; count: number; venda: number }>;
  byFornecedor: Array<{ fornecedor: string; count: number; venda: number }>;
  bySeller: Array<{ vendedor: string; orders: number; venda: number; comissaoVendedor: number }>;
  orders?: Array<Record<string, unknown>>;
}
export interface Vendedor { nome: string; email: string; role: string }

export interface SyncState { lastSyncAt: string | null; lastCount: number | null; lastError: string | null }

export interface ReportFilters { vendedor?: string; month?: number; year?: number; status?: string; produto?: string; fornecedor?: string; search?: string; includeOrders?: boolean }

export interface Facets { statuses: string[]; produtos: string[]; fornecedores: string[]; anos: number[]; meses: number[] }

function toParams(f: ReportFilters): Record<string, string> {
  const p: Record<string, string> = {};
  if (f.vendedor) p.vendedor = f.vendedor;
  if (f.month) p.month = String(f.month);
  if (f.year) p.year = String(f.year);
  if (f.status) p.status = f.status;
  if (f.produto) p.produto = f.produto;
  if (f.fornecedor) p.fornecedor = f.fornecedor;
  if (f.search) p.search = f.search;
  if (f.includeOrders) p.includeOrders = 'true';
  return p;
}

export const salesReportsService = {
  async getReport(f: ReportFilters = {}): Promise<SalesReport> {
    const { data } = await api.get('/sales-reports', { params: toParams(f) });
    return data.data;
  },
  async getVendedores(): Promise<Vendedor[]> {
    const { data } = await api.get('/sales-reports/vendedores');
    return data.data;
  },
  async getFacets(): Promise<Facets> {
    const { data } = await api.get('/sales-reports/facets');
    return data.data;
  },
  async syncNow(): Promise<{ count: number; lastSyncAt: string; skipped?: boolean }> {
    const { data } = await api.post('/sales-reports/sync');
    return data.data;
  },
  async getSyncState(): Promise<SyncState | null> {
    const { data } = await api.get('/sales-reports/sync-state');
    return data.data;
  },
};
