import { api } from '@/lib/api';

/**
 * Contrato do espelho da caixa reservas@ (API: módulo mailbox-mirror).
 * Só leitura: a resposta continua sendo pelo Gmail.
 */

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/** Linha da lista: sem corpo (o corpo só vem no detalhe). */
export interface EmailSummary {
  id: string;
  mailboxId: string;
  subject: string | null;
  fromAddr: string | null;
  fromName: string | null;
  toAddrs: string[];
  ccAddrs: string[];
  /** ISO; null quando o e-mail veio sem data. */
  sentAt: string | null;
  snippet: string | null;
  hasAttachments: boolean;
}

export type EmailContactRole = 'FROM' | 'TO' | 'CC' | 'REPLY_TO';

export interface LinkedContact {
  role: EmailContactRole;
  contact: { id: string; name: string | null };
}

/** Linha da caixa inteira (gestão): vem com os clientes ligados. */
export interface MailboxEmailSummary extends EmailSummary {
  contacts: LinkedContact[];
}

export interface EmailAttachment {
  id: string;
  position: number;
  filename: string | null;
  contentType: string;
  size: number;
  /** false = passou do limite e não foi guardado (só o nome). */
  stored: boolean;
}

export interface EmailDetail extends EmailSummary {
  messageId: string;
  inReplyTo: string | null;
  textBody: string | null;
  /** HTML CRU: sempre passar por `sanitizeEmailHtml` antes de mostrar. */
  htmlBody: string | null;
  attachments: EmailAttachment[];
  /** Só os contatos que o usuário alcança (vendedor não vê cliente de colega). */
  contacts: { role: EmailContactRole; contact: { id: string; name: string | null; email: string | null } }[];
}

export interface Mailbox {
  id: string;
  address: string;
  imapHost: string;
  folder: string | null;
  enabled: boolean;
  lastUid: string;
  lastSyncAt: string | null;
  lastError: string | null;
  passwordEnv: string;
  messageCount: number;
}

export interface EmailPage<T> {
  emails: T[];
  pagination: Pagination;
}

export const EMAILS_PAGE_SIZE = 20;
// Anexo de até 15 MB: o timeout padrão (15 s) é curto para baixar.
const DOWNLOAD_TIMEOUT_MS = 120_000;

export const mailboxService = {
  async listContactEmails(contactId: string, page: number): Promise<EmailPage<EmailSummary>> {
    const { data } = await api.get(`/contacts/${contactId}/emails`, {
      params: { page, limit: EMAILS_PAGE_SIZE },
    });
    return data.data;
  },

  async getEmail(id: string): Promise<EmailDetail> {
    const { data } = await api.get(`/emails/${id}`);
    return data.data;
  },

  async listMailboxes(): Promise<Mailbox[]> {
    const { data } = await api.get('/mailboxes');
    return data.data;
  },

  async listMailboxEmails(
    mailboxId: string,
    page: number,
    isUnlinkedOnly: boolean,
  ): Promise<EmailPage<MailboxEmailSummary>> {
    const { data } = await api.get(`/mailboxes/${mailboxId}/emails`, {
      params: { page, limit: EMAILS_PAGE_SIZE, ...(isUnlinkedOnly ? { unlinked: 'true' } : {}) },
    });
    return data.data;
  },

  /** O anexo exige o token: baixa como blob em vez de um <a href> direto. */
  async fetchAttachment(emailId: string, attachmentId: string): Promise<Blob> {
    const { data } = await api.get<Blob>(`/emails/${emailId}/attachments/${attachmentId}`, {
      responseType: 'blob',
      timeout: DOWNLOAD_TIMEOUT_MS,
    });
    return data;
  },
};

/** Entrega o blob ao navegador como arquivo, com o nome original. */
export function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Dá tempo ao navegador de começar o download antes de soltar a URL.
  setTimeout(() => URL.revokeObjectURL(url), 1_000);
}
