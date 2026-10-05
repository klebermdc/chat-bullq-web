'use client';

import { useEffect, useRef, useState } from 'react';
import { Bot, BotOff, Sparkles, Check, Play } from 'lucide-react';
import type { Conversation } from '../services/inbox.service';

type AiOverride = boolean | null;

interface Props {
  conversation: Conversation;
  disabled?: boolean;
  onChange: (next: AiOverride) => void | Promise<void>;
  onEngage: () => void | Promise<void>;
}

const OPTIONS: Array<{
  value: AiOverride;
  label: string;
  hint: string;
  icon: React.ElementType;
  badgeCls: string;
}> = [
  {
    value: null,
    label: 'Padrão',
    hint: 'Segue config geral, horário e canal',
    icon: Bot,
    badgeCls:
      'bg-foreground/[0.07] text-foreground hover:bg-foreground/10',
  },
  {
    value: true,
    label: 'IA forçada',
    hint: 'Sobrepõe kill switch e horário — IA responde mesmo se geral estiver off',
    icon: Sparkles,
    badgeCls:
      'bg-success-wash text-success-ink hover:bg-success/20',
  },
  {
    value: false,
    label: 'IA pausada',
    hint: 'Sobrepõe global — IA NÃO responde nesta conversa',
    icon: BotOff,
    badgeCls:
      'bg-warning-wash text-warning-ink hover:bg-warning/20',
  },
];

export function ConversationAiToggle({
  conversation,
  disabled,
  onChange,
  onEngage,
}: Props) {
  const current =
    conversation.aiEnabled === undefined ? null : (conversation.aiEnabled as AiOverride);
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

  const meta = OPTIONS.find((o) => o.value === current) ?? OPTIONS[0];
  const Icon = meta.icon;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((p) => !p);
        }}
        disabled={disabled}
        title={meta.hint}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={`IA nesta conversa: ${meta.label}`}
        className={`inline-flex h-11 items-center gap-2 rounded-xl px-3.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 lg:h-10 ${meta.badgeCls}`}
      >
        <Icon aria-hidden="true" className="h-[18px] w-[18px]" />
        {meta.label}
      </button>

      {open && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute right-0 top-full z-30 mt-1.5 w-[min(21rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-border bg-popover shadow-overlay"
        >
          <div className="border-b border-border px-3.5 py-2.5">
            <p id="ai-toggle-label" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              IA nesta conversa
            </p>
          </div>
          <div role="radiogroup" aria-labelledby="ai-toggle-label">
          {OPTIONS.map((opt) => {
            const isActive = opt.value === current;
            const OptIcon = opt.icon;
            return (
              <button
                key={String(opt.value)}
                type="button"
                role="radio"
                aria-checked={isActive}
                onClick={() => {
                  setOpen(false);
                  onChange(opt.value);
                }}
                disabled={disabled}
                className={`flex min-h-11 w-full items-start gap-3 px-3.5 py-2.5 text-left text-sm transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${
                  isActive ? 'bg-primary/10' : ''
                }`}
              >
                <OptIcon aria-hidden="true" className="mt-0.5 h-[18px] w-[18px] shrink-0 text-muted-foreground" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">
                      {opt.label}
                    </span>
                    {isActive && <Check aria-hidden="true" className="h-4 w-4 text-primary" />}
                  </div>
                  <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
                    {opt.hint}
                  </p>
                </div>
              </button>
            );
          })}
          </div>

          <div className="border-t border-border" />
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onEngage();
            }}
            disabled={disabled || current === false}
            title={
              current === false
                ? 'A IA está pausada nesta conversa. Reative antes de engajar.'
                : 'Faz a IA ler o histórico e responder agora, sem esperar nova mensagem do cliente.'
            }
            className="flex min-h-11 w-full items-start gap-3 px-3.5 py-2.5 text-left text-sm text-foreground transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Play aria-hidden="true" className="mt-0.5 h-[18px] w-[18px] shrink-0 text-muted-foreground" />
            <div className="flex-1">
              <p className="font-semibold">Engajar IA agora</p>
              <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
                Lê o histórico, entende o contexto e responde imediatamente.
              </p>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
