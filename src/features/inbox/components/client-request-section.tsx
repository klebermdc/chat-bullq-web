'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Users, CalendarRange, Ticket, ExternalLink, ClipboardList, AlertTriangle, Loader2, Check } from 'lucide-react';
import { contactsService, type Contact } from '@/features/contacts/services/contacts.service';
import { proposalsService } from '@/features/proposals/services/proposals.service';
import { orderFichaService } from '@/features/order-ficha/order-ficha.service';
import { formatMoney } from '@/lib/money';

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

/** "1 dia", "3 dias" — o número decide a forma. */
function plural(count: number, one: string, many: string): string {
  return `${count} ${Number(count) === 1 ? one : many}`;
}

const CARD_HEADER_LABEL =
  'text-[11px] font-semibold uppercase tracking-wider text-muted-foreground';

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
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-soft">
          <div className="flex items-center justify-between gap-2 border-b border-border/60 bg-muted/40 px-4 py-2.5">
            <span className={CARD_HEADER_LABEL}>Última proposta</span>
            <span className="shrink-0 font-mono text-sm font-semibold tabular-nums text-foreground">
              {formatMoney(lastProposal.totalValue, lastProposal.currency) ?? '—'}
            </span>
          </div>
          <div className="space-y-3 p-4">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Users aria-hidden="true" className="h-4 w-4 text-muted-foreground" />
                {plural(lastProposal.adults, 'adulto', 'adultos')}
                {lastProposal.children > 0 ? ` · ${plural(lastProposal.children, 'criança', 'crianças')}` : ''}
              </span>
              <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                <CalendarRange aria-hidden="true" className="h-4 w-4 text-muted-foreground" />
                {fmtDate(lastProposal.startDate)} – {fmtDate(lastProposal.endDate)}
              </span>
            </div>
            <ul className="space-y-1.5">
              {lastProposal.parks.map((p, i) => (
                <li key={i} className="flex items-start gap-2 text-sm leading-snug text-muted-foreground">
                  <Ticket aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <span>
                    {p.nome} <span className="whitespace-nowrap text-xs">· {plural(p.dias, 'dia', 'dias')}</span>
                  </span>
                </li>
              ))}
            </ul>
            {/* Proposta enviada sem link não tem carrinho para abrir. */}
            {lastProposal.checkoutUrl && (
              <a
                href={lastProposal.checkoutUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Abrir carrinho <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
        </div>
      )}

      {/* ── Ficha do Pedido ───────────────────────────────────────── */}
      {!!orderFicha?.items?.length && (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-soft">
          <div className="flex items-center justify-between gap-2 border-b border-border/60 bg-muted/40 px-4 py-2.5">
            <span className={CARD_HEADER_LABEL}>Ficha do pedido</span>
            {divergences.length > 0 && (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-warning-wash px-2 py-0.5 text-[11px] font-semibold text-warning-ink">
                <AlertTriangle aria-hidden="true" className="h-3 w-3" /> {plural(divergences.length, 'divergência', 'divergências')}
              </span>
            )}
          </div>
          <div className="space-y-2.5 p-4">
            <ul className="space-y-1">
              {orderFicha.items.map((it, i) => (
                <li key={i} className="flex items-baseline gap-2 text-sm text-foreground">
                  <span className="min-w-[1.75rem] shrink-0 font-mono font-semibold tabular-nums text-foreground">{it.quantidade}×</span>
                  <span className="text-muted-foreground">
                    {it.produto}{it.tipo ? <span className="text-xs"> · {it.tipo}</span> : ''}
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
              <div className="flex gap-2.5 rounded-xl border border-warning/30 bg-warning-wash p-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning-ink" />
                <div className="space-y-1">
                  <p className="text-xs font-bold text-warning-ink">Precisa de atenção</p>
                  {divergences.map((d, i) => (
                    <p key={i} className="text-xs leading-snug text-warning-ink">{d.message}</p>
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
          <label htmlFor="client-request-note" className={CARD_HEADER_LABEL}>Anotação do pedido</label>
          {saving ? (
            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" /> salvando</span>
          ) : savedFlash ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-success-ink"><Check className="h-3 w-3" /> salvo</span>
          ) : null}
        </div>
        <textarea
          id="client-request-note"
          value={note}
          disabled={saving}
          placeholder="O que o cliente está pedindo (datas, parques, produtos)…"
          onChange={(e) => setNote(e.target.value)}
          onBlur={commitNote}
          rows={3}
          className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
        />
      </div>

      {!hasAny && !note.trim() && (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border px-4 py-6 text-center">
          <ClipboardList aria-hidden="true" className="h-5 w-5 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Nenhuma proposta ou ficha ainda.<br />Anote acima o que o cliente pediu.
          </p>
        </div>
      )}
    </div>
  );
}
