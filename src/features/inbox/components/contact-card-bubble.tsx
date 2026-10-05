'use client';

import { Copy, MessageCirclePlus, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import { dialablePhone, type SharedContact } from '../lib/shared-contacts';

type Props = {
  contacts: SharedContact[];
  isOutbound: boolean;
  /** Abre "Nova conversa" já com o número. Ausente = só copiar. */
  onStartConversation?: (phone: string, name: string) => void;
};

async function copyPhone(phone: string) {
  try {
    await navigator.clipboard.writeText(phone);
    toast.success('Número copiado');
  } catch {
    toast.error('Não foi possível copiar');
  }
}

/** Cartão de contato que o cliente compartilhou — nome, telefones e ação de chamar. */
export function ContactCardBubble({ contacts, isOutbound, onStartConversation }: Props) {
  const boxCls = isOutbound
    ? 'border-bubble-foreground/20 bg-bubble-foreground/10'
    : 'border-border bg-muted/60';
  // Enviado: realce derivado da tinta do balão. Recebido: lilás da marca.
  const btnCls = isOutbound
    ? 'hover:bg-bubble-foreground/15'
    : 'hover:bg-primary/10 hover:text-primary';
  const iconCls = isOutbound ? 'bg-bubble-foreground/15' : 'bg-primary/10 text-primary';

  return (
    <div className="flex min-w-[220px] flex-col gap-2">
      {contacts.map((c, i) => (
        <div key={`${c.name}-${i}`} className={`rounded-xl border px-3 py-2.5 text-sm ${boxCls}`}>
          <div className="flex items-center gap-2.5">
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${iconCls}`}>
              <UserRound className="h-[18px] w-[18px]" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-[15px] font-semibold">{c.name}</p>
              {c.org && <p className="truncate text-xs opacity-75">{c.org}</p>}
            </div>
          </div>
          {c.phones.length === 0 && <p className="mt-1.5 text-xs opacity-75">Sem telefone no cartão</p>}
          {c.phones.map((p, j) => (
            <div key={`${p.phone}-${j}`} className="mt-1.5 flex items-center justify-between gap-2">
              <span className="truncate font-mono text-[13px] tabular-nums">{p.phone}</span>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => void copyPhone(dialablePhone(p))}
                  className={`flex h-9 w-9 items-center justify-center rounded-xl opacity-90 transition-colors hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${btnCls}`}
                  title="Copiar número"
                  aria-label={`Copiar número de ${c.name}`}
                >
                  <Copy className="h-4 w-4" />
                </button>
                {onStartConversation && (
                  <button
                    type="button"
                    onClick={() => onStartConversation(dialablePhone(p), c.name)}
                    className={`flex h-9 items-center gap-1.5 rounded-xl px-2.5 text-[13px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${btnCls}`}
                    title="Iniciar conversa com este contato"
                  >
                    <MessageCirclePlus className="h-4 w-4" />
                    Conversar
                  </button>
                )}
              </div>
            </div>
          ))}
          {c.emails?.map((e) => (
            <p key={e} className="mt-1 truncate text-xs opacity-75">{e}</p>
          ))}
        </div>
      ))}
    </div>
  );
}
