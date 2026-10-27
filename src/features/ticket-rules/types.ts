/**
 * Base de regras de ingressos de Orlando (mercado Brasil/LATAM), gerada por
 * scripts/build-ticket-rules.mjs. Só regras — nenhum preço entra aqui.
 */

/** desde_data_inicio: conta da data escolhida na compra; desde_primeiro_uso: da 1ª visita; data_unica: só na data reservada; nenhuma: add-on. */
export type TicketWindowType = 'desde_data_inicio' | 'desde_primeiro_uso' | 'data_unica' | 'nenhuma';
export type TicketAccess = '1_parque_por_dia' | 'visitas_totais' | 'ilimitado' | '1_visita' | 'addon' | 'evento';
/** encerrado = venda encerrada (o já emitido continua valendo); verificar = venda no Brasil não confirmada. */
export type TicketStatus = 'ativo' | 'encerrado' | 'sazonal' | 'verificar';

export interface TicketAgeBand {
  band: string;
  min: number;
  max: number | null;
  free: boolean;
  note: string;
}

export interface TicketRule {
  id: string;
  operatorId: string;
  status: TicketStatus;
  name: string;
  nameEn: string;
  description: string;
  saleEnd: string | null;
  useStart: string | null;
  useEnd: string | null;
  parks: string[];
  days: number | null;
  visits: number | null;
  access: TicketAccess | null;
  parkHopping: boolean | null;
  hoppingRule: string;
  windowType: TicketWindowType | null;
  /** Dias corridos contando o inicial: último dia = início + windowDays − 1. */
  windowDays: number | null;
  windowRule: string;
  activationMonths: number | null;
  finalValidity: string | null;
  reservationRequired: boolean | null;
  ageBands: TicketAgeBand[];
  ageHeight: string;
  refund: string;
  dateChange: string;
  transferable: boolean;
  identification: string;
  includes: string[];
  excludes: string[];
  sellerAlerts: string[];
  /** Pontos não confirmados em fonte oficial: conferir com o fornecedor. */
  pending: string[];
  confidence: 'alta' | 'media' | 'baixa';
}

export interface TicketCatalog {
  verifiedAt: string;
  operators: { id: string; name: string }[];
  parks: { id: string; name: string }[];
  rules: TicketRule[];
}
