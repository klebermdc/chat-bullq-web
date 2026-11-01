import { api } from '@/lib/api';

export interface DiaryMetrics {
  conversations: number;
  messagesSent: number;
  medianReplyMinutes: number | null;
  slowReplies: number;
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

export interface Diary {
  id: string;
  userId: string;
  day: string;
  status: 'READY' | 'EMPTY' | 'FAILED';
  metrics: DiaryMetrics;
  summary: string | null;
  strengths: DiaryPoint[];
  improvements: DiaryPoint[];
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

// A API embrulha respostas em { data, meta }.
const unwrap = <T,>(body: { data?: T } | T): T =>
  ((body as { data?: T })?.data ?? body) as T;

export const MY_DIARY_QUERY_KEY = ['attendant-diary', 'me'];

export async function fetchMyDiary(): Promise<Diary | null> {
  const { data } = await api.get('/attendant-diaries/me');
  return unwrap<Diary | null>(data) || null;
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
