import { api } from '@/lib/api';

export type CopilotTurn = { role: 'user' | 'assistant'; content: string };

/** Turno do modo Consulta: a resposta da IA pode trazer um texto pronto para o cliente. */
export type ConsultTurn = CopilotTurn & { suggestion?: string | null };

/** Conversa aberta e mensagem clicada ("Perguntar à IA"). */
export interface ConsultContext {
  conversationId?: string;
  messageId?: string;
}

export interface ConsultReply {
  reply: string;
  suggestion: string | null;
}

/** Mesmo marcador que a API pede ao modelo; mantém a sugestão no histórico. */
const SUGGESTION_MARKER = 'SUGESTÃO PARA O CLIENTE:';
const HISTORY_TURNS = 10;

// A API embrulha respostas em { data, meta }.
function unwrap<T>(data: unknown): T {
  return ((data as { data?: T })?.data ?? data) as T;
}

/** Modo Dados (SQL no banco) — só Proprietário e Admin. */
export async function askCopilot(
  text: string,
  history: CopilotTurn[],
): Promise<string> {
  const { data } = await api.post('/copilot/ask', { text, history });
  return unwrap<{ reply: string }>(data).reply;
}

export function toHistory(turns: ConsultTurn[]): CopilotTurn[] {
  return turns.slice(-HISTORY_TURNS).map((t) => ({
    role: t.role,
    content: t.suggestion ? `${t.content}\n\n${SUGGESTION_MARKER}\n${t.suggestion}` : t.content,
  }));
}

/** Modo Consulta — conhecimento da Aline, para todos os logados. */
export async function consultCopilot(
  text: string,
  turns: ConsultTurn[],
  context: ConsultContext = {},
): Promise<ConsultReply> {
  const { data } = await api.post('/copilot/consult', {
    text,
    history: toHistory(turns),
    ...context,
  });
  const payload = unwrap<ConsultReply>(data);
  return { reply: payload.reply, suggestion: payload.suggestion ?? null };
}
