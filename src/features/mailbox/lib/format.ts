import type { EmailPage, EmailSummary, LinkedContact, Mailbox } from '../services/mailbox.service';

const MINUTE_MS = 60_000;
const MINUTES_PER_HOUR = 60;
const HOURS_PER_DAY = 24;
const KB = 1024;
const MB = KB * 1024;
// Sincronização roda a cada 5 min; passou de 20 sem rodar, algo travou.
export const SYNC_STALE_MINUTES = 20;

const SHORT_DATE = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
const TIME = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' });
const FULL_DATE = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short' });

export const NO_SUBJECT = '(sem assunto)';

export function subjectOf(email: Pick<EmailSummary, 'subject'>): string {
  return email.subject?.trim() || NO_SUBJECT;
}

/** Nome de quem mandou; sem nome, o endereço. */
export function senderLabel(email: Pick<EmailSummary, 'fromName' | 'fromAddr'>): string {
  return email.fromName?.trim() || email.fromAddr?.trim() || 'Remetente desconhecido';
}

/** Data da linha: só a hora quando é de hoje, senão dd/mm/aa. */
export function formatListDate(iso: string | null, now: Date = new Date()): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const isToday = date.toDateString() === now.toDateString();
  return isToday ? TIME.format(date) : SHORT_DATE.format(date);
}

export function formatFullDate(iso: string | null): string {
  if (!iso) return 'Sem data';
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? 'Sem data' : FULL_DATE.format(date);
}

export function formatFileSize(bytes: number): string {
  if (bytes >= MB) return `${(bytes / MB).toFixed(1).replace('.', ',')} MB`;
  if (bytes >= KB) return `${Math.round(bytes / KB)} KB`;
  return `${bytes} B`;
}

/** "há 3 min", "há 2 h", "há 4 dias". */
export function timeAgo(iso: string, now: Date = new Date()): string {
  const minutes = Math.max(0, Math.floor((now.getTime() - new Date(iso).getTime()) / MINUTE_MS));
  if (minutes < 1) return 'agora há pouco';
  if (minutes < MINUTES_PER_HOUR) return `há ${minutes} min`;
  const hours = Math.floor(minutes / MINUTES_PER_HOUR);
  if (hours < HOURS_PER_DAY) return `há ${hours} h`;
  const days = Math.floor(hours / HOURS_PER_DAY);
  return `há ${days} ${days === 1 ? 'dia' : 'dias'}`;
}

export type SyncTone = 'ok' | 'warning' | 'error';

export interface SyncStatus {
  tone: SyncTone;
  text: string;
}

/** Linha de status da caixa na tela de gestão. */
export function syncStatus(mailbox: Mailbox, now: Date = new Date()): SyncStatus {
  if (!mailbox.enabled) return { tone: 'warning', text: 'Sincronização desligada' };
  if (mailbox.lastError) return { tone: 'error', text: `Erro na sincronização: ${mailbox.lastError}` };
  if (!mailbox.lastSyncAt) return { tone: 'warning', text: 'Ainda não sincronizou' };
  const minutes = (now.getTime() - new Date(mailbox.lastSyncAt).getTime()) / MINUTE_MS;
  const text = `Última sincronização ${timeAgo(mailbox.lastSyncAt, now)}`;
  return { tone: minutes > SYNC_STALE_MINUTES ? 'warning' : 'ok', text };
}

/** Próxima página para o `useInfiniteQuery`; undefined quando acabou. */
export function nextPageParam(last: EmailPage<unknown>): number | undefined {
  const { page, totalPages } = last.pagination;
  return page < totalPages ? page + 1 : undefined;
}

/** Um chip por cliente, mesmo que ele apareça como remetente e em cópia. */
export function uniqueContacts(links: LinkedContact[]): LinkedContact['contact'][] {
  const seen = new Map<string, LinkedContact['contact']>();
  links.forEach(({ contact }) => {
    if (!seen.has(contact.id)) seen.set(contact.id, contact);
  });
  return Array.from(seen.values());
}
