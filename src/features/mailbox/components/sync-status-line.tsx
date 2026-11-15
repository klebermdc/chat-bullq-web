import { AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { syncStatus, type SyncTone } from '../lib/format';
import type { Mailbox } from '../services/mailbox.service';

const TONE: Record<SyncTone, { icon: typeof Clock; cls: string }> = {
  ok: { icon: CheckCircle2, cls: 'text-muted-foreground' },
  warning: { icon: Clock, cls: 'text-warning-ink' },
  error: { icon: AlertTriangle, cls: 'text-urgent-ink' },
};

/** "Última sincronização há X min" ou o erro em vermelho, com a contagem. */
export function SyncStatusLine({ mailbox, now }: { mailbox: Mailbox; now?: Date }) {
  const status = syncStatus(mailbox, now);
  const { icon: Icon, cls } = TONE[status.tone];
  return (
    <p
      role={status.tone === 'error' ? 'alert' : 'status'}
      className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm"
    >
      <span className={cn('inline-flex min-w-0 items-center gap-1.5 break-words', cls)}>
        <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />
        {status.text}
      </span>
      <span className="text-muted-foreground">
        <span className="font-mono tabular-nums">{mailbox.messageCount.toLocaleString('pt-BR')}</span> e-mails
        espelhados de <span className="font-medium text-foreground">{mailbox.address}</span>
      </span>
    </p>
  );
}
