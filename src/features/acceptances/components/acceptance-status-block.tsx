'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { FileCheck2, FileText, Send, Loader2, User } from 'lucide-react';
import { toAbsoluteApiUrl } from '@/features/inbox/services/inbox.service';
import { acceptancesService } from '../services/acceptances.service';
import type { AcceptanceStatus } from '../types';

const LABEL: Record<AcceptanceStatus, string> = {
  PENDING: 'Pendente',
  SIGNED: 'Assinado',
  EXPIRED: 'Expirado',
  CANCELED: 'Cancelado',
};

/** Cor do selo de status, alinhada às demais badges do drawer. */
function statusClasses(status: AcceptanceStatus): string {
  switch (status) {
    case 'SIGNED':
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400';
    case 'EXPIRED':
    case 'CANCELED':
      return 'bg-muted text-muted-foreground';
    case 'PENDING':
    default:
      return 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400';
  }
}

/**
 * Bloco do card do cliente que mostra o status do Aceite de Entrega vinculado à
 * conversa: selo (Pendente/Assinado/Expirado/Cancelado), itens assinados, auditoria
 * (quem/quando/IP), link do PDF e o botão "Reenviar link". Não renderiza nada quando
 * não há aceite para a conversa.
 */
export function AcceptanceStatusBlock({ conversationId }: { conversationId: string }) {
  const { data: acc } = useQuery({
    queryKey: ['acceptance', conversationId],
    queryFn: () => acceptancesService.getForConversation(conversationId),
    enabled: !!conversationId,
  });

  const [resending, setResending] = useState(false);

  if (!acc) return null;

  const pdfUrl = toAbsoluteApiUrl(acc.pdfUrl ?? undefined);

  async function resend() {
    if (resending) return;
    setResending(true);
    try {
      await acceptancesService.resend(acc!.id);
      toast.success('Link reenviado.');
    } catch {
      toast.error('Falha ao reenviar.');
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between gap-2 border-b border-border/60 bg-muted/40 px-4 py-2.5">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          <FileCheck2 className="h-3.5 w-3.5 text-primary/70" /> Aceite de entrega
        </span>
        <span
          className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${statusClasses(acc.status)}`}
        >
          {LABEL[acc.status]}
        </span>
      </div>

      <div className="space-y-3 p-4">
        {/* Auditoria de assinatura */}
        {acc.status === 'SIGNED' && (acc.signerName || acc.signedAt) && (
          <div className="space-y-1">
            <p className="inline-flex items-center gap-1.5 text-sm text-foreground">
              <User className="h-4 w-4 text-primary/70" />
              {acc.signerName || 'Assinado'}
              {acc.signedAt && (
                <span className="text-muted-foreground">
                  · {new Date(acc.signedAt).toLocaleString('pt-BR')}
                </span>
              )}
            </p>
            {acc.signerIp && (
              <p className="pl-6 text-xs text-muted-foreground/80">IP {acc.signerIp}</p>
            )}
          </div>
        )}

        {/* Itens do aceite */}
        {acc.items.length > 0 && (
          <ul className="space-y-1">
            {acc.items.map((it, i) => (
              <li key={i} className="flex items-baseline gap-2 text-sm text-foreground">
                {typeof it.qty === 'number' && (
                  <span className="min-w-[1.75rem] shrink-0 font-semibold tabular-nums text-primary">
                    {it.qty}×
                  </span>
                )}
                <span className="text-muted-foreground">{it.description}</span>
              </li>
            ))}
          </ul>
        )}

        {/* Ações */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1">
          {pdfUrl && (
            <a
              href={pdfUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg text-sm font-semibold text-primary outline-none transition-all hover:gap-2.5 focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              <FileText className="h-3.5 w-3.5" /> Comprovante PDF
            </a>
          )}
          {acc.status !== 'SIGNED' && (
            <button
              type="button"
              onClick={resend}
              disabled={resending}
              className="inline-flex items-center gap-1.5 rounded-lg text-sm font-semibold text-primary outline-none transition-all hover:gap-2.5 focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-60"
            >
              {resending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              Reenviar link
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
