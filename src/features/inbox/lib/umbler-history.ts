/**
 * Histórico importado da Umbler: as conversas do cliente de antes da virada
 * pro Sendtur. É arquivo — só leitura, numa lista à parte do cache de
 * mensagens, desenhada acima do histórico do Sendtur.
 */
import { isConversationBoundary, prependUnique } from './contact-history';

export type UmblerSide = 'sent' | 'received';
export type UmblerMediaKind = 'image' | 'audio' | 'video' | 'file' | 'none';

interface UmblerFileLike {
  url: string;
  mimeType: string | null;
}

/** Cliente fala do lado de quem recebe; atendente e robô, do nosso. */
export function umblerSide(origin: string): UmblerSide {
  return origin.toLowerCase() === 'contact' ? 'received' : 'sent';
}

/** Emenda uma página mais antiga no começo, sem repetir mensagem da virada. */
export function mergeOlderUmblerPage<T extends { id: string }>(
  current: readonly T[],
  olderPage: readonly T[],
): T[] {
  return prependUnique(olderPage, current);
}

/** Cursor pra pedir a página anterior; null pede a mais recente. */
export function oldestUmblerCursor(
  messages: readonly { id: string; sentAt: string }[],
): { beforeAt: string; beforeId: string } | null {
  const oldest = messages[0];
  if (!oldest) return null;
  return { beforeAt: oldest.sentAt, beforeId: oldest.id };
}

/** Esta mensagem abre uma conversa da Umbler — é onde a divisória entra. */
export const isUmblerConversationBoundary = isConversationBoundary;

function dayKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/** Virou o dia em relação à mensagem anterior — é onde a pílula de dia entra. */
export function isUmblerNewDay(
  messages: readonly { sentAt: string }[],
  index: number,
): boolean {
  if (index === 0) return true;
  return dayKey(messages[index].sentAt) !== dayKey(messages[index - 1].sentAt);
}

/** "março de 2025"; null quando não há data válida. */
export function formatMonthYear(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

/** Texto do botão que abre o arquivo da Umbler. */
export function umblerButtonLabel(messageCount: number, oldestAt: string | null): string {
  const count = messageCount.toLocaleString('pt-BR');
  const noun = messageCount === 1 ? 'mensagem' : 'mensagens';
  const since = formatMonthYear(oldestAt);
  return `Ver histórico da Umbler · ${count} ${noun}${since ? ` desde ${since}` : ''}`;
}

const KIND_BY_TYPE: Record<string, UmblerMediaKind> = {
  image: 'image',
  sticker: 'image',
  audio: 'audio',
  video: 'video',
  file: 'file',
};

function kindFromMime(mimeType: string | null): UmblerMediaKind {
  if (mimeType?.startsWith('image/')) return 'image';
  if (mimeType?.startsWith('audio/')) return 'audio';
  if (mimeType?.startsWith('video/')) return 'video';
  return 'file';
}

/** Como desenhar o arquivo da mensagem; 'none' quando não há arquivo útil. */
export function umblerMediaKind(message: {
  type: string;
  file: UmblerFileLike | null;
}): UmblerMediaKind {
  if (!message.file?.url) return 'none';
  return KIND_BY_TYPE[message.type.toLowerCase()] ?? kindFromMime(message.file.mimeType);
}
