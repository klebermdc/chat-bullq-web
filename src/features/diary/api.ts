import { api } from '@/lib/api';

export interface DiaryMetrics {
  conversations: number;
  messagesSent: number;
  medianReplyMinutes: number | null;
  slowReplies: number;
  longestReplyMinutes?: number | null;
  unansweredAtEndOfDay: number;
  onlineMinutes: number;
}

export interface DiaryPoint {
  criterion: string;
  title: string;
  explanation: string;
  conversationId: string;
  quote: string;
  suggestion: string | null;
}

export interface DiaryScore {
  criterion: string;
  score: number;
  reason: string;
}

export interface DiaryConversationReview {
  conversationId: string;
  contactName: string;
  topic: string;
  assessment: string;
  nextStep: string | null;
}

export interface DiaryPending {
  conversationId: string;
  contactName: string;
  waitingSince: string;
}

/** Diários antigos ou sem atendimento podem não ter todos os campos. */
export interface DiaryDetails {
  focus?: string | null;
  scores?: DiaryScore[];
  conversations?: DiaryConversationReview[];
  practice?: { situation: string; reply: string } | null;
  pending?: DiaryPending[];
}

export interface Diary {
  id: string;
  userId: string;
  day: string;
  status: 'READY' | 'EMPTY' | 'FAILED';
  metrics: DiaryMetrics;
  summary: string | null;
  strengths: DiaryPoint[];
  improvements: DiaryPoint[];
  details?: DiaryDetails;
  viewedAt: string | null;
}

export interface ManagerDiary extends Diary {
  conversationsAnalyzed: number;
  discardedPoints: number;
  costUsd: number;
  errorMessage: string | null;
}

export interface DiaryParticipant {
  userId: string;
  name: string;
}

// A API embrulha toda resposta em { data, meta }, inclusive quando data é null.
const unwrap = <T,>(body: { data: T }): T => body.data;

export const MY_DIARY_QUERY_KEY = ['attendant-diary', 'me'];

export async function fetchMyDiary(): Promise<Diary | null> {
  const { data } = await api.get('/attendant-diaries/me');
  return unwrap<Diary | null>(data);
}

export async function markDiaryViewed(id: string): Promise<void> {
  await api.post(`/attendant-diaries/${id}/viewed`);
}

export async function fetchTeamDiaries(userId?: string): Promise<ManagerDiary[]> {
  const { data } = await api.get('/attendant-diaries', { params: { userId } });
  return unwrap<ManagerDiary[]>(data);
}

export async function fetchDiaryParticipants(): Promise<DiaryParticipant[]> {
  const { data } = await api.get('/attendant-diaries/participants');
  return unwrap<DiaryParticipant[]>(data);
}

export async function generateDiary(userId: string): Promise<void> {
  await api.post('/attendant-diaries/generate', { userId });
}
