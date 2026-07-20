export interface OrderFichaItem {
  produto: string;
  quantidade: number;
  tipo?: string | null;
}

export interface OrderFichaDivergence {
  kind: string;
  message: string;
  detectedAt: string;
}

export interface OrderFicha {
  id: string;
  items: OrderFichaItem[];
  travelDatesText: string | null;
  requestedAt: string | null;
  sourceMessageId: string | null;
  status: string;
  divergences: OrderFichaDivergence[];
  lastProposalId: string | null;
}
