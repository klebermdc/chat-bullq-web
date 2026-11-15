import type { ReactNode } from 'react';
import { Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatListDate, senderLabel, subjectOf } from '../lib/format';
import type { EmailSummary } from '../services/mailbox.service';

interface EmailRowProps {
  email: EmailSummary;
  onOpen: (emailId: string) => void;
  /** Mostra a prévia do texto (a gaveta do cliente é estreita e dispensa). */
  isSnippetShown?: boolean;
  /** Conteúdo extra abaixo da linha, fora do botão (ex.: chips de cliente). */
  footer?: ReactNode;
}

/** Uma linha de e-mail: remetente, assunto, data e o clipe quando há anexo. */
export function EmailRow({ email, onOpen, isSnippetShown = false, footer }: EmailRowProps) {
  const sender = senderLabel(email);
  const subject = subjectOf(email);
  return (
    <li className="border-b border-border/60 last:border-b-0">
      <button
        type="button"
        onClick={() => onOpen(email.id)}
        aria-label={`Abrir e-mail "${subject}" de ${sender}`}
        className="flex w-full min-w-0 items-start gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{subject}</p>
          <p className="truncate text-xs text-muted-foreground">{sender}</p>
          {isSnippetShown && email.snippet && (
            <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground/80">{email.snippet}</p>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <time dateTime={email.sentAt ?? undefined} className="font-mono text-xs tabular-nums text-muted-foreground">
            {formatListDate(email.sentAt)}
          </time>
          {email.hasAttachments && (
            <Paperclip aria-label="Com anexo" role="img" className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </div>
      </button>
      {footer && <div className="px-3 pb-2.5">{footer}</div>}
    </li>
  );
}

interface EmailListProps {
  children: ReactNode;
  className?: string;
  label: string;
}

/** Moldura da lista: cartão com divisórias, o mesmo das outras listas do app. */
export function EmailList({ children, className, label }: EmailListProps) {
  return (
    <ul aria-label={label} className={cn('overflow-hidden rounded-xl border border-border bg-card', className)}>
      {children}
    </ul>
  );
}

interface LoadMoreProps {
  hasMore: boolean;
  isLoading: boolean;
  onLoadMore: () => void;
}

export function LoadMoreButton({ hasMore, isLoading, onLoadMore }: LoadMoreProps) {
  if (!hasMore) return null;
  return (
    <div className="mt-2 flex justify-center">
      <Button variant="ghost" size="sm" loading={isLoading} onClick={onLoadMore}>
        Carregar mais
      </Button>
    </div>
  );
}
