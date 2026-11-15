'use client';

import { Download, FileWarning, Loader2, Paperclip } from 'lucide-react';
import { Dialog } from '@/components/ui/dialog';
import { EmptyState, LoadingState } from '@/components/ui/empty-state';
import { cn } from '@/lib/utils';
import { useAttachmentDownload, useEmailDetail } from '../hooks/use-mailbox';
import { formatFileSize, formatFullDate, senderLabel, subjectOf } from '../lib/format';
import type { EmailAttachment, EmailDetail } from '../services/mailbox.service';
import { EmailBodyFrame } from './email-body-frame';

/**
 * Leitor do e-mail. Abre por cima da gaveta do cliente (z-60) e da ficha do
 * funil (z-50), por isso a camada própria.
 */
const READER_LAYER = 'z-[70]';

interface EmailReaderDialogProps {
  emailId: string | null;
  onClose: () => void;
}

export function EmailReaderDialog({ emailId, onClose }: EmailReaderDialogProps) {
  const { data: email, isLoading, isError } = useEmailDetail(emailId);
  const title = email ? subjectOf(email) : 'E-mail';

  return (
    <Dialog
      open={!!emailId}
      onClose={onClose}
      title={<span className="line-clamp-2 break-words">{title}</span>}
      size="2xl"
      layerClassName={READER_LAYER}
    >
      {isLoading ? (
        <LoadingState label="Abrindo e-mail…" />
      ) : isError || !email ? (
        <EmptyState
          size="sm"
          icon={FileWarning}
          title="Não foi possível abrir este e-mail"
          description="Ele pode ter sido removido ou ser de um cliente que você não atende."
        />
      ) : (
        <div className="space-y-4">
          <EmailHeaders email={email} />
          {email.attachments.length > 0 && <AttachmentChips emailId={email.id} attachments={email.attachments} />}
          <EmailBodyFrame html={email.htmlBody} text={email.textBody} title={`Conteúdo do e-mail: ${title}`} />
        </div>
      )}
    </Dialog>
  );
}

function EmailHeaders({ email }: { email: EmailDetail }) {
  const from = email.fromName && email.fromAddr ? `${email.fromName} <${email.fromAddr}>` : senderLabel(email);
  const rows = [
    { label: 'De', value: from },
    { label: 'Para', value: email.toAddrs.join(', ') },
    { label: 'Cc', value: email.ccAddrs.join(', ') },
    { label: 'Data', value: formatFullDate(email.sentAt) },
  ].filter((row) => row.value);

  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
      {rows.map((row) => (
        <div key={row.label} className="contents">
          <dt className="text-muted-foreground">{row.label}</dt>
          <dd className="min-w-0 break-words text-foreground">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

const CHIP_CLS =
  'inline-flex max-w-full items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium';

export function AttachmentChips({ emailId, attachments }: { emailId: string; attachments: EmailAttachment[] }) {
  const { download, downloadingId } = useAttachmentDownload(emailId);

  return (
    <ul aria-label="Anexos" className="flex flex-wrap gap-2">
      {attachments.map((att) => {
        const name = att.filename || 'anexo';
        const isDownloading = downloadingId === att.id;
        const Icon = isDownloading ? Loader2 : att.stored ? Download : Paperclip;
        return (
          <li key={att.id} className="max-w-full">
            <button
              type="button"
              onClick={() => download(att)}
              disabled={!att.stored || isDownloading}
              title={att.stored ? `Baixar ${name}` : 'Anexo grande demais: não foi guardado. Abra no Gmail.'}
              className={cn(
                CHIP_CLS,
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                att.stored
                  ? 'text-foreground transition-colors hover:bg-muted'
                  : 'cursor-not-allowed border-dashed text-muted-foreground',
              )}
            >
              <Icon aria-hidden="true" className={cn('h-3.5 w-3.5 shrink-0', isDownloading && 'animate-spin')} />
              <span className="min-w-0 truncate">{name}</span>
              <span className="shrink-0 font-mono tabular-nums text-muted-foreground">{formatFileSize(att.size)}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
