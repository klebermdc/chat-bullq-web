'use client';

import { useState } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useOrgId } from '@/hooks/use-org-query-key';
import { nextPageParam } from '../lib/format';
import { mailboxService, saveBlob, type EmailAttachment } from '../services/mailbox.service';

const CONTACT_EMAILS_KEY = 'contact-emails';
const EMAIL_KEY = 'mailbox-email';
const MAILBOXES_KEY = 'mailboxes';
const MAILBOX_EMAILS_KEY = 'mailbox-emails';
// A caixa sincroniza a cada 5 min: reconsultar antes disso não traz nada novo.
const STALE_MS = 60_000;
const SYNC_REFRESH_MS = 60_000;
const FIRST_PAGE = 1;

/** Some com a lista achatada das páginas carregadas. */
function flatten<T>(pages: { emails: T[] }[] | undefined): T[] {
  return pages?.flatMap((p) => p.emails) ?? [];
}

/** E-mails do cliente (mais novos primeiro), página a página. */
export function useContactEmails(contactId: string | null | undefined, enabled = true) {
  const orgId = useOrgId();
  const query = useInfiniteQuery({
    queryKey: [CONTACT_EMAILS_KEY, orgId, contactId],
    queryFn: ({ pageParam }) => mailboxService.listContactEmails(contactId as string, pageParam),
    initialPageParam: FIRST_PAGE,
    getNextPageParam: nextPageParam,
    enabled: enabled && !!contactId,
    staleTime: STALE_MS,
  });
  return { ...query, emails: flatten(query.data?.pages) };
}

export function useEmailDetail(emailId: string | null) {
  const orgId = useOrgId();
  return useQuery({
    queryKey: [EMAIL_KEY, orgId, emailId],
    queryFn: () => mailboxService.getEmail(emailId as string),
    enabled: !!emailId,
    // O e-mail não muda depois de chegar.
    staleTime: Infinity,
  });
}

/** Caixas espelhadas e o status da sincronização (só gestão). */
export function useMailboxes(enabled = true) {
  const orgId = useOrgId();
  return useQuery({
    queryKey: [MAILBOXES_KEY, orgId],
    queryFn: () => mailboxService.listMailboxes(),
    enabled,
    refetchInterval: SYNC_REFRESH_MS,
  });
}

export function useMailboxEmails(mailboxId: string | null, isUnlinkedOnly: boolean) {
  const orgId = useOrgId();
  const query = useInfiniteQuery({
    queryKey: [MAILBOX_EMAILS_KEY, orgId, mailboxId, isUnlinkedOnly],
    queryFn: ({ pageParam }) => mailboxService.listMailboxEmails(mailboxId as string, pageParam, isUnlinkedOnly),
    initialPageParam: FIRST_PAGE,
    getNextPageParam: nextPageParam,
    enabled: !!mailboxId,
    staleTime: STALE_MS,
  });
  return { ...query, emails: flatten(query.data?.pages) };
}

/** Baixa um anexo com o token (blob) e entrega como arquivo. */
export function useAttachmentDownload(emailId: string) {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const download = async (attachment: EmailAttachment) => {
    if (!attachment.stored || downloadingId) return;
    setDownloadingId(attachment.id);
    try {
      const blob = await mailboxService.fetchAttachment(emailId, attachment.id);
      saveBlob(blob, attachment.filename || 'anexo');
    } catch (err) {
      console.error('[mailbox] falha ao baixar anexo', { emailId, attachmentId: attachment.id, err });
      toast.error('Não foi possível baixar o anexo. Tente de novo ou abra no Gmail.');
    } finally {
      setDownloadingId(null);
    }
  };

  return { download, downloadingId };
}
