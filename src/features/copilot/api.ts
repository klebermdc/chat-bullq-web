import { api } from '@/lib/api';

export type CopilotTurn = { role: 'user' | 'assistant'; content: string };

export async function askCopilot(
  text: string,
  history: CopilotTurn[],
): Promise<string> {
  const { data } = await api.post('/copilot/ask', { text, history });
  // A API embrulha respostas em { data, meta }.
  const payload = (data?.data ?? data) as { reply: string };
  return payload.reply;
}
