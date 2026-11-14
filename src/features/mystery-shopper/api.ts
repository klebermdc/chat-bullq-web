import { api } from '@/lib/api';
import type { SimulatorMessage } from './bubbles';

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

export type FunnelStepKey = 'responded' | 'discovery' | 'proposal' | 'objection' | 'closing' | 'followUp';
export type CriticalReason = 'NO_REPLY' | 'WRONG_INFO';
export type SellerTrend = 'UP' | 'DOWN' | 'SAME';

export interface KpiCriterion {
  criterion: string;
  label: string;
}

export interface FunnelStep {
  key: FunnelStepKey;
  label: string;
  reached: number;
  total: number;
  pct: number | null;
}

export interface CriterionAverage extends KpiCriterion {
  average: number | null;
  rated: number;
}

export interface CriticalVisit {
  visitId: string;
  sellerName: string;
  reason: CriticalReason;
  evaluatedAt: string;
}

export interface KpiOverall {
  visits: number;
  openVisits: number;
  averageScore: number | null;
  previousAverageScore: number | null;
  approvedPct: number | null;
  medianFirstReplyMinutes: number | null;
  within15MinPct: number | null;
  funnel: FunnelStep[];
  criteriaAverages: CriterionAverage[];
  weakestCriterion: (KpiCriterion & { average: number }) | null;
  criticalVisits: CriticalVisit[];
}

export interface SellerKpi {
  sellerUserId: string;
  sellerName: string;
  visits: number;
  averageScore: number;
  previousAverageScore: number | null;
  trend: SellerTrend | null;
  isSmallSample: boolean;
  byCriterion: Record<string, number | null>;
  medianFirstReplyMinutes: number | null;
  proposalPct: number;
  followUpPct: number;
  topImprovements: string[];
}

export interface MysteryShopperKpis {
  month: string;
  criteria: KpiCriterion[];
  overall: KpiOverall;
  sellers: SellerKpi[];
}

export interface ShopperNumber {
  id: string;
  label: string;
  createdAt: string;
  contact: { phone: string | null };
  isSimulated: boolean;
  channelId: string | null;
}

export interface ShopperChannel {
  id: string;
  name: string;
}

export type BotStatus = 'ACTIVE' | 'CLOSING' | 'ENDED' | 'STOPPED' | 'FAILED';

export interface SimulatorBot {
  status: BotStatus;
  persona: string;
  clientMessages: number;
  lastError: string | null;
}

export interface SimulatorState {
  number: { id: string; label: string; phone: string; profileName: string | null };
  conversationId: string | null;
  messages: SimulatorMessage[];
  bot: SimulatorBot | null;
}

export const SHOPPER_KEY = ['mystery-shopper'] as const;
export const VISITS_QUERY_KEY = [...SHOPPER_KEY, 'visits'] as const;
export const NUMBERS_QUERY_KEY = [...SHOPPER_KEY, 'numbers'] as const;
export const CHANNELS_QUERY_KEY = [...SHOPPER_KEY, 'channels'] as const;
export const simulatorQueryKey = (numberId: string) => [...SHOPPER_KEY, 'simulator', numberId] as const;
export const kpisQueryKey = (month: string) => [...SHOPPER_KEY, 'kpis', month] as const;
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

export async function fetchKpis(month: string): Promise<MysteryShopperKpis> {
  const { data } = await api.get('/mystery-shopper/kpis', { params: { month } });
  return unwrap<MysteryShopperKpis>(data);
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

export async function fetchChannels(): Promise<ShopperChannel[]> {
  const { data } = await api.get('/mystery-shopper/channels');
  return unwrap<ShopperChannel[]>(data);
}

export async function addSimulatedNumber(input: {
  label: string;
  profileName?: string;
  channelId: string;
}): Promise<ShopperNumber> {
  const { data } = await api.post('/mystery-shopper/numbers/simulated', input);
  return unwrap<ShopperNumber>(data);
}

export async function fetchSimulator(numberId: string): Promise<SimulatorState> {
  const { data } = await api.get(`/mystery-shopper/simulator/${numberId}`);
  return unwrap<SimulatorState>(data);
}

export async function sendSimulatorMessage(input: {
  numberId: string;
  text: string;
}): Promise<{ queued: boolean; externalMessageId: string }> {
  const { data } = await api.post(`/mystery-shopper/simulator/${input.numberId}/messages`, { text: input.text });
  return unwrap<{ queued: boolean; externalMessageId: string }>(data);
}

export async function startBot(input: { numberId: string; persona: string }): Promise<void> {
  await api.post(`/mystery-shopper/simulator/${input.numberId}/bot`, { persona: input.persona });
}

export async function stopBot(numberId: string): Promise<void> {
  await api.delete(`/mystery-shopper/simulator/${numberId}/bot`);
}

export async function generatePersona(brief: string): Promise<string> {
  const { data } = await api.post('/mystery-shopper/personas/generate', { brief });
  return unwrap<{ persona: string }>(data).persona;
}
