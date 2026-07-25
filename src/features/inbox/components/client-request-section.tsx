'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { contactsService, type Contact } from '@/features/contacts/services/contacts.service';
import { proposalsService } from '@/features/proposals/services/proposals.service';
import { orderFichaService } from '@/features/order-ficha/order-ficha.service';

interface ClientRequestSectionProps {
  contact: Contact;
  conversationId: string;
  onSaved: () => void;
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
  });

  const initialNote = (contact.metadata?.requestNotes as string) ?? '';
  const [note, setNote] = useState(initialNote);
  const [saving, setSaving] = useState(false);
  useEffect(() => { setNote((contact.metadata?.requestNotes as string) ?? ''); }, [contact.id]);

  const commitNote = async () => {
    const next = note.trim();
    if (next === initialNote.trim()) return;
    setSaving(true);
    try {
      await contactsService.update(contact.id, {
        metadata: { ...(contact.metadata ?? {}), requestNotes: next },
      });
      toast.success('Anotação salva');
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar');
      setNote(initialNote);
    } finally {
      setSaving(false);
    }
  };

  const hasAny = !!lastProposal || (orderFicha?.items?.length ?? 0) > 0;

  return (
    <div className="space-y-4">
      {lastProposal && (
        <div>
          <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Última proposta</p>
          <p className="text-sm">
            {lastProposal.adults} adulto(s)
            {lastProposal.children > 0 ? ` e ${lastProposal.children} criança(s)` : ''}{' · '}
            {new Date(lastProposal.startDate).toLocaleDateString('pt-BR')} a{' '}
            {new Date(lastProposal.endDate).toLocaleDateString('pt-BR')}
          </p>
          <ul className="mt-1 text-sm text-muted-foreground">
            {lastProposal.parks.map((p, i) => (<li key={i}>{p.nome} [{p.dias} dias]</li>))}
          </ul>
          <p className="mt-1 text-sm font-semibold">
            {lastProposal.currency}{' '}
            {Number(lastProposal.totalValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <a href={lastProposal.checkoutUrl} target="_blank" rel="noreferrer" className="text-sm text-primary underline">
            Abrir carrinho
          </a>
        </div>
      )}

      {!!orderFicha?.items?.length && (
        <div>
          <p className="mb-1 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            Ficha do Pedido
            {!!orderFicha.divergences?.length && (
              <span className="normal-case text-amber-700 dark:text-amber-400">
                ⚠️ {orderFicha.divergences.length} divergência(s)
              </span>
            )}
          </p>
          <ul className="mt-1 text-sm text-muted-foreground">
            {orderFicha.items.map((it, i) => (
              <li key={i}>{it.quantidade}× {it.produto}{it.tipo ? ` (${it.tipo})` : ''}</li>
            ))}
          </ul>
          {orderFicha.travelDatesText && (
            <p className="mt-1 text-sm text-muted-foreground">Viagem: {orderFicha.travelDatesText}</p>
          )}
          {orderFicha.requestedAt && (
            <p className="mt-1 text-sm text-muted-foreground">
              Pedido em: {new Date(orderFicha.requestedAt).toLocaleString('pt-BR')}
            </p>
          )}
          {!!orderFicha.divergences?.length && (
            <div className="mt-2 rounded-md border border-amber-300/50 bg-amber-50/60 p-2.5 dark:border-amber-500/30 dark:bg-amber-500/10">
              {orderFicha.divergences.map((d, i) => (
                <p key={i} className="text-[11px] text-amber-700 dark:text-amber-400">• {d.message}</p>
              ))}
            </div>
          )}
        </div>
      )}

      <div>
        <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Anotação do pedido</p>
        <textarea
          value={note}
          disabled={saving}
          placeholder="O que o cliente está pedindo (datas, parques, produtos)…"
          onChange={(e) => setNote(e.target.value)}
          onBlur={commitNote}
          rows={3}
          className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60"
        />
      </div>

      {!hasAny && !note.trim() && (
        <p className="text-sm text-muted-foreground">
          Nenhuma proposta ou ficha ainda. Use a anotação acima para registrar o que o cliente pediu.
        </p>
      )}
    </div>
  );
}
