import type { ChannelCosts, CostDay } from '../services/whatsapp-costs.service';

/** Dados de exemplo para os testes da tela de custos. */
export function makeDay(overrides: Partial<CostDay> = {}): CostDay {
  return { date: '2026-11-01', cost: 0, billable: 0, free: 0, byCategory: {}, ...overrides };
}

export function makeChannel(overrides: Partial<ChannelCosts> = {}): ChannelCosts {
  return {
    channelId: 'ch-1',
    channelName: 'OFP Vendas',
    currency: 'BRL',
    status: 'ok',
    error: null,
    totals: { cost: 0, billable: 0, free: 0, byCategory: [] },
    daily: [],
    ...overrides,
  };
}

export const withCost = (channelId: string, cost: number, extra: Partial<ChannelCosts> = {}) =>
  makeChannel({ channelId, totals: { cost, billable: 1, free: 0, byCategory: [] }, ...extra });
