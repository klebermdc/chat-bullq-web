import type { SimulatorBot } from './api';

export const MIN_PERSONA_CHARS = 10;
export const MAX_PERSONA_CHARS = 2000;

export interface BotView {
  /** Selo a mostrar; null quando não há robô em andamento. */
  badge: string | null;
  canStop: boolean;
  /** Mostra o formulário de cenário (sem robô ativo). */
  showForm: boolean;
  /** Erro da última execução, só quando ela falhou. */
  error: string | null;
  /** Aviso neutro sobre a execução anterior (encerrada ou parada). */
  notice: string | null;
}

export function describeBot(bot: SimulatorBot | null): BotView {
  if (bot?.status === 'ACTIVE') {
    const n = bot.clientMessages;
    return {
      badge: `🤖 Robô conversando (${n} ${n === 1 ? 'mensagem' : 'mensagens'})`,
      canStop: true,
      showForm: false,
      error: null,
      notice: null,
    };
  }
  if (bot?.status === 'CLOSING') {
    return { badge: '🤖 Robô aguardando follow-up', canStop: true, showForm: false, error: null, notice: null };
  }
  const error = bot?.status === 'FAILED' ? (bot.lastError?.trim() || 'O robô parou por um erro.') : null;
  const notice =
    bot?.status === 'ENDED' ? 'Visita encerrada pelo robô.' : bot?.status === 'STOPPED' ? 'Robô parado.' : null;
  return { badge: null, canStop: false, showForm: true, error, notice };
}

export const isPersonaValid = (persona: string): boolean => persona.trim().length >= MIN_PERSONA_CHARS;

export const MIN_BRIEF_CHARS = 5;
export const MAX_BRIEF_CHARS = 500;

export const isBriefValid = (brief: string): boolean => {
  const length = brief.trim().length;
  return length >= MIN_BRIEF_CHARS && length <= MAX_BRIEF_CHARS;
};

/** Texto a guardar para "Desfazer" ao trocar o cenário pela persona gerada; null se não havia nada. */
export const undoSnapshot = (current: string): string | null => (current.trim() ? current : null);
