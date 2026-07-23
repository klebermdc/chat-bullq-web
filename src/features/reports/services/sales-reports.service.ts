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

export interface ReportFilters { vendedor?: string; day?: number; month?: number; year?: number; status?: string; produto?: string; fornecedor?: string; search?: string; includeOrders?: boolean }

export interface Facets { statuses: string[]; produtos: string[]; fornecedores: string[]; anos: number[]; meses: number[] }

export interface OrdersPage { data: Array<Record<string, unknown>>; page: number; perPage: number; total: number; totalPages: number }

export interface OrphanSuggestion {
  cardId: string;
  conversationId: string | null;
  contactName: string | null;
  score: number;
  reasons: string[];
}
export interface OrphanEntry {
  order: {
    externalId: string;
    pedido: string | null;
    cliente: string | null;
    venda: number | null;
    data: string | null;
  };
  suggestions: OrphanSuggestion[];
}

function toParams(f: ReportFilters): Record<string, string> {
  const p: Record<string, string> = {};
  if (f.vendedor) p.vendedor = f.vendedor;
  if (f.day) p.day = String(f.day);
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
  async getOrdersPage(f: ReportFilters, page = 1, perPage = 50): Promise<OrdersPage> {
    const { data } = await api.get('/sales-reports/orders', {
      params: { ...toParams(f), page: String(page), per_page: String(perPage) },
    });
    return data.data;
  },
  async syncNow(): Promise<{ count: number; lastSyncAt: string; skipped?: boolean }> {
    // O sync pagina o OFP Hub e faz upsert de ~8.5k pedidos — passa fácil do
    // timeout global de 15s do client. Sem este override o navegador aborta a
    // requisição ("timeout of 15000ms exceeded") mesmo com o backend terminando.
    const { data } = await api.post('/sales-reports/sync', undefined, { timeout: 180000 });
    return data.data;
  },
  async getSyncState(): Promise<SyncState | null> {
    const { data } = await api.get('/sales-reports/sync-state');
    return data.data;
  },
  // E5.2c — Fila de reconciliação (pedidos do HUB sem card correlacionado).
  async listReconciliation(): Promise<OrphanEntry[]> {
    const { data } = await api.get('/sales-reports/reconciliation');
    return data.data ?? data;
  },
  async linkReconciliation(orderExternalId: string, cardId: string): Promise<void> {
    await api.post('/sales-reports/reconciliation/link', { orderExternalId, cardId });
  },
};
