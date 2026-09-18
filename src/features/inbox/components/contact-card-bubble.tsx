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
    : 'border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/60';
  const btnCls = isOutbound
    ? 'hover:bg-bubble-foreground/15'
    : 'hover:bg-zinc-200 dark:hover:bg-zinc-700';

  return (
    <div className="flex min-w-[220px] flex-col gap-2">
      {contacts.map((c, i) => (
        <div key={`${c.name}-${i}`} className={`rounded-lg border px-3 py-2 text-sm ${boxCls}`}>
          <div className="flex items-center gap-2">
            <UserRound className="h-4 w-4 shrink-0 opacity-70" />
            <div className="min-w-0">
              <p className="truncate font-medium">{c.name}</p>
              {c.org && <p className="truncate text-[11px] opacity-70">{c.org}</p>}
            </div>
          </div>
          {c.phones.length === 0 && <p className="mt-1 text-[11px] italic opacity-70">Sem telefone no cartão</p>}
          {c.phones.map((p, j) => (
            <div key={`${p.phone}-${j}`} className="mt-1.5 flex items-center justify-between gap-2">
              <span className="truncate font-mono text-[12px] tabular-nums">{p.phone}</span>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => void copyPhone(dialablePhone(p))}
                  className={`rounded p-1 opacity-70 transition-colors hover:opacity-100 ${btnCls}`}
                  title="Copiar número"
                  aria-label={`Copiar número de ${c.name}`}
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
                {onStartConversation && (
                  <button
                    type="button"
                    onClick={() => onStartConversation(dialablePhone(p), c.name)}
                    className={`flex items-center gap-1 rounded px-1.5 py-1 text-[11px] font-medium transition-colors ${btnCls}`}
                    title="Iniciar conversa com este contato"
                  >
                    <MessageCirclePlus className="h-3.5 w-3.5" />
                    Conversar
                  </button>
                )}
              </div>
            </div>
          ))}
          {c.emails?.map((e) => (
            <p key={e} className="mt-1 truncate text-[11px] opacity-70">{e}</p>
          ))}
        </div>
      ))}
    </div>
  );
}
