import { api } from '@/lib/api';

const unwrap = <T,>(body: { data: T }): T => body.data;

export type VisitStatus = 'OPEN' | 'EVALUATING' | 'DONE' | 'FAILED' | 'DISCARDED';
export type Score = 0 | 1 | 2;

export interface CriterionScore {
  criterion: string;
  label: string;
  score: Score | null;
  evidence: string;
  comment: string;
  measuredBy: 'CODE' | 'AI';
}

export interface VisitSummary {
  summary: string;
  strengths: string[];
  improvements: string[];
}

export interface VisitMetrics {
  firstHumanReplyMinutes: number | null;
  humanMessages: number;
  followUps: number;
  firstFollowUpHours: number | null;
  proposalSent: boolean;
  lastShopperMessageAt: string | null;
}

export interface VisitListItem {
  id: string;
  status: VisitStatus;
  scenario: string | null;
  sellerName: string | null;
  totalScore: number | null;
  createdAt: string;
  closesAt: string | null;
  evaluatedAt: string | null;
  error: string | null;
}

export interface VisitLine {
  messageId: string;
  role: 'CLIENTE' | 'VENDEDOR' | 'AUTOMATICA' | 'EQUIPE';
  text: string;
  createdAt: string;
}

export interface VisitDetail extends VisitListItem {
  metrics: VisitMetrics | null;
  scores: CriterionScore[];
  summary: VisitSummary | null;
  lines: VisitLine[];
}

export interface RankingRow {
  sellerUserId: string;
  sellerName: string;
  visits: number;
  average: number;
  isSmallSample: boolean;
  byCriterion: Record<string, number>;
}

export interface ShopperNumber {
  id: string;
  label: string;
  createdAt: string;
  contact: { phone: string | null };
}

export const SHOPPER_KEY = ['mystery-shopper'] as const;
export const VISITS_QUERY_KEY = [...SHOPPER_KEY, 'visits'] as const;
export const RANKING_QUERY_KEY = [...SHOPPER_KEY, 'ranking'] as const;
export const NUMBERS_QUERY_KEY = [...SHOPPER_KEY, 'numbers'] as const;
export const visitQueryKey = (id: string) => [...SHOPPER_KEY, 'visit', id] as const;

export async function fetchAccess(): Promise<{ allowed: boolean }> {
  const { data } = await api.get('/mystery-shopper/access');
  return unwrap<{ allowed: boolean }>(data);
}

export async function fetchVisits(): Promise<VisitListItem[]> {
  const { data } = await api.get('/mystery-shopper/visits');
  return unwrap<VisitListItem[]>(data);
}

export async function fetchVisit(id: string): Promise<VisitDetail> {
  const { data } = await api.get(`/mystery-shopper/visits/${id}`);
  return unwrap<VisitDetail>(data);
}

export async function updateScenario(input: { id: string; scenario: string }): Promise<void> {
  await api.patch(`/mystery-shopper/visits/${input.id}`, { scenario: input.scenario });
}

export async function requestEvaluation(id: string): Promise<void> {
  await api.post(`/mystery-shopper/visits/${id}/evaluate`);
}

export async function discardVisit(id: string): Promise<void> {
  await api.post(`/mystery-shopper/visits/${id}/discard`);
}

export async function fetchRanking(): Promise<RankingRow[]> {
  const { data } = await api.get('/mystery-shopper/ranking');
  return unwrap<RankingRow[]>(data);
}

export async function fetchNumbers(): Promise<ShopperNumber[]> {
  const { data } = await api.get('/mystery-shopper/numbers');
  return unwrap<ShopperNumber[]>(data);
}

export async function addNumber(input: { phone: string; label: string }): Promise<void> {
  await api.post('/mystery-shopper/numbers', input);
}

export async function removeNumber(id: string): Promise<void> {
  await api.delete(`/mystery-shopper/numbers/${id}`);
}
