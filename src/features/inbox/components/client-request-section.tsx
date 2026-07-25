'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Users, CalendarRange, Ticket, ExternalLink, ClipboardList, AlertTriangle, Loader2, Check } from 'lucide-react';
import { contactsService, type Contact } from '@/features/contacts/services/contacts.service';
import { proposalsService } from '@/features/proposals/services/proposals.service';
import { orderFichaService } from '@/features/order-ficha/order-ficha.service';

interface ClientRequestSectionProps {
  contact: Contact;
  conversationId: string;
  onSaved: () => void;
}

/**
 * Formata data ISO só-data ('YYYY-MM-DD') como dd/mm/aaaa SEM shift de fuso.
 * `new Date('2026-08-23')` é meia-noite UTC → no Brasil (UTC-3) volta um dia.
 * Aqui lemos os componentes da string direto; cai no Date só se vier hora.
 */
function fmtDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? iso : d.toLocaleDateString('pt-BR');
}

export function ClientRequestSection({ contact, conversationId, onSaved }: ClientRequestSectionProps) {
  const { data: proposals } = useQuery({
    queryKey: ['proposals', contact.id],
    queryFn: () => proposalsService.listForContact(contact.id),
    enabled: !!contact.id,
  });
  const lastProposal = proposals?.[0];

  const { data: orderFicha } = useQuery({
    queryKey: ['order-ficha', conversationId],
    queryFn: () => orderFichaService.getForConversation(conversationId),
    enabled: !!conversationId,
  });

  const initialNote = (contact.metadata?.requestNotes as string) ?? '';
  const [note, setNote] = useState(initialNote);
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  useEffect(() => { setNote((contact.metadata?.requestNotes as string) ?? ''); }, [contact.id, contact.metadata?.requestNotes]);

  const commitNote = async () => {
    const next = note.trim();
    if (next === initialNote.trim()) return;
    setSaving(true);
    try {
      await contactsService.update(contact.id, {
        metadata: { ...(contact.metadata ?? {}), requestNotes: next },
      });
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1800);
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar');
      setNote(initialNote);
    } finally {
      setSaving(false);
    }
  };

  const divergences = orderFicha?.divergences ?? [];
  const hasAny = !!lastProposal || (orderFicha?.items?.length ?? 0) > 0;

  return (
    <div className="space-y-3">
      {/* ── Última proposta ───────────────────────────────────────── */}
      {lastProposal && (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between gap-2 border-b border-border/60 bg-muted/40 px-4 py-2.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Última proposta
            </span>
            <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-sm font-bold text-primary">
              {lastProposal.currency} {Number(lastProposal.totalValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="space-y-3 p-4">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Users className="h-4 w-4 text-primary/70" />
                {lastProposal.adults} adulto(s)
                {lastProposal.children > 0 ? ` · ${lastProposal.children} criança(s)` : ''}
              </span>
              <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                <CalendarRange className="h-4 w-4 text-primary/70" />
                {fmtDate(lastProposal.startDate)} – {fmtDate(lastProposal.endDate)}
              </span>
            </div>
            <ul className="space-y-1.5">
              {lastProposal.parks.map((p, i) => (
                <li key={i} className="flex items-start gap-2 text-sm leading-snug text-muted-foreground">
                  <Ticket className="mt-0.5 h-4 w-4 shrink-0 text-primary/50" />
                  <span>
                    {p.nome} <span className="whitespace-nowrap text-xs opacity-70">· {p.dias} dias</span>
                  </span>
                </li>
              ))}
            </ul>
            <a
              href={lastProposal.checkoutUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg text-sm font-semibold text-primary outline-none transition-all hover:gap-2.5 focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              Abrir carrinho <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      )}

      {/* ── Ficha do Pedido ───────────────────────────────────────── */}
      {!!orderFicha?.items?.length && (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between gap-2 border-b border-border/60 bg-muted/40 px-4 py-2.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Ficha do Pedido
            </span>
            {divergences.length > 0 && (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">
                <AlertTriangle className="h-3 w-3" /> {divergences.length} divergência(s)
              </span>
            )}
          </div>
          <div className="space-y-2.5 p-4">
            <ul className="space-y-1">
              {orderFicha.items.map((it, i) => (
                <li key={i} className="flex items-baseline gap-2 text-sm text-foreground">
                  <span className="min-w-[1.75rem] shrink-0 font-semibold tabular-nums text-primary">{it.quantidade}×</span>
                  <span className="text-muted-foreground">
                    {it.produto}{it.tipo ? <span className="text-xs opacity-70"> · {it.tipo}</span> : ''}
                  </span>
                </li>
              ))}
            </ul>
            {(orderFicha.travelDatesText || orderFicha.requestedAt) && (
              <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-border/50 pt-2 text-xs text-muted-foreground">
                {orderFicha.travelDatesText && (
                  <span className="inline-flex items-center gap-1.5"><CalendarRange className="h-3.5 w-3.5" /> {orderFicha.travelDatesText}</span>
                )}
                {orderFicha.requestedAt && (
                  <span>Pedido em {new Date(orderFicha.requestedAt).toLocaleDateString('pt-BR')}</span>
                )}
              </div>
            )}
            {divergences.length > 0 && (
              <div className="flex gap-2.5 rounded-xl border border-amber-300/60 bg-amber-50 p-3 dark:border-amber-500/30 dark:bg-amber-500/10">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <div className="space-y-1">
                  <p className="text-xs font-bold text-amber-800 dark:text-amber-300">Precisa de atenção</p>
                  {divergences.map((d, i) => (
                    <p key={i} className="text-xs leading-snug text-amber-700 dark:text-amber-400/90">{d.message}</p>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Anotação manual ───────────────────────────────────────── */}
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Anotação do pedido</span>
          {saving ? (
            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" /> salvando</span>
          ) : savedFlash ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400"><Check className="h-3 w-3" /> salvo</span>
          ) : null}
        </div>
        <textarea
          value={note}
          disabled={saving}
          placeholder="O que o cliente está pedindo (datas, parques, produtos)…"
          onChange={(e) => setNote(e.target.value)}
          onBlur={commitNote}
          rows={3}
          className="w-full resize-none rounded-xl border border-border bg-muted/20 px-3.5 py-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary/40 focus:bg-card focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
        />
      </div>

      {!hasAny && !note.trim() && (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border bg-muted/20 px-4 py-8 text-center">
          <ClipboardList className="h-6 w-6 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            Nenhuma proposta ou ficha ainda.<br />Anote acima o que o cliente pediu.
          </p>
        </div>
      )}
    </div>
  );
}
