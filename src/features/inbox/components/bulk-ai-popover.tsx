'use client';

import { useEffect, useRef, useState } from 'react';
import { Bot, BotOff, Sparkles, Play } from 'lucide-react';

type AiOverride = boolean | null;

interface Props {
  count: number;
  disabled?: boolean;
  onSetOverride: (override: AiOverride) => void | Promise<void>;
  onEngage: () => void | Promise<void>;
}

const OPTIONS: Array<{
  value: AiOverride;
  label: string;
  hint: string;
  icon: React.ElementType;
  iconCls: string;
}> = [
  {
    value: null,
    label: 'Padrão',
    hint: 'Segue config geral, horário e canal',
    icon: Bot,
    iconCls: 'text-muted-foreground',
  },
  {
    value: true,
    label: 'IA forçada',
    hint: 'Sobrepõe kill switch e horário — IA responde mesmo se geral estiver off',
    icon: Sparkles,
    iconCls: 'text-success-ink',
  },
  {
    value: false,
    label: 'IA pausada',
    hint: 'Sobrepõe global — IA NÃO responde nessas conversas',
    icon: BotOff,
    iconCls: 'text-warning-ink',
  },
];

/**
 * Bulk-action variant of ConversationAiToggle. Same vocabulary as the
 * per-conversation toggle (Padrão / IA forçada / IA pausada / Engajar
 * agora) but applies to N selected conversations at once via fan-out.
 *
 * Doesn't show a "current" state — selection can have mixed overrides,
 * so we just present the four target actions.
 */
export function BulkAiPopover({ count, disabled, onSetOverride, onEngage }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [open]);

  return (
    // Sem `relative` de propósito: o painel ancora na barra de ações em massa
    // (que é `relative`) e abre alinhado à direita dela, dentro da coluna.
    <div ref={ref}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((p) => !p);
        }}
        disabled={disabled}
        title="Configurar IA das conversas selecionadas"
        aria-label="Configurar IA das conversas selecionadas"
        aria-expanded={open}
        className="flex h-11 w-11 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 md:h-10 md:w-10"
      >
        <Bot className="h-5 w-5" />
      </button>
      {open && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute right-2 top-full z-30 mt-1 w-80 max-w-[calc(100%-1rem)] overflow-hidden rounded-2xl border border-border bg-popover shadow-elevated"
        >
          <div className="border-b border-border px-3.5 py-2.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              IA · {count} selecionada{count > 1 ? 's' : ''}
            </p>
          </div>
          {OPTIONS.map((opt) => {
            const OptIcon = opt.icon;
            return (
              <button
                key={String(opt.value)}
                onClick={() => {
                  setOpen(false);
                  onSetOverride(opt.value);
                }}
                disabled={disabled}
                className="flex w-full items-start gap-3 px-3.5 py-3 text-left text-sm transition-colors hover:bg-primary/10 disabled:opacity-50"
              >
                <OptIcon className={`mt-0.5 h-5 w-5 shrink-0 ${opt.iconCls}`} />
                <div className="flex-1">
                  <span className="font-semibold text-foreground">
                    {opt.label}
                  </span>
                  <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
                    {opt.hint}
                  </p>
                </div>
              </button>
            );
          })}

          <div className="border-t border-border" />
          <button
            onClick={() => {
              setOpen(false);
              onEngage();
            }}
            disabled={disabled}
            title="Faz a IA ler o histórico e responder cada uma agora — pula conversas com IA pausada."
            className="flex w-full items-start gap-3 bg-primary/5 px-3.5 py-3 text-left text-sm text-primary transition-colors hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Play className="mt-0.5 h-5 w-5 shrink-0 fill-current" />
            <div className="flex-1">
              <p className="font-semibold">Engajar IA agora</p>
              <p className="mt-0.5 text-xs leading-snug">
                Lê o histórico de cada conversa e responde imediatamente.
              </p>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
