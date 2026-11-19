'use client';

import { useEffect } from 'react';
import { Sparkles, X } from 'lucide-react';
import { ConsultChat } from './consult-chat';

export interface ConsultFocus {
  messageId: string;
  /** Trecho da mensagem do cliente, para o vendedor saber do que está perguntando. */
  preview: string;
}

interface CopilotConsultPanelProps {
  conversationId: string;
  focus: ConsultFocus | null;
  onClose: () => void;
  onUseSuggestion: (text: string) => void;
}

const AUTO_QUESTION = 'O que eu respondo para essa mensagem do cliente?';
const STARTERS = [
  'Resume o que o cliente quer',
  'Tem regra ou preço pra isso?',
  'Esse cliente já comprou com a gente?',
];
const PREVIEW_MAX = 180;

/** Painel lateral da conversa: o vendedor tira dúvida com a IA sem sair do atendimento. */
export function CopilotConsultPanel({ conversationId, focus, onClose, onUseSuggestion }: CopilotConsultPanelProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const preview = focus?.preview.trim() ?? '';
  return (
    <aside
      role="dialog"
      aria-label="Perguntar à IA"
      className="fixed inset-y-0 right-0 z-40 flex w-full max-w-md flex-col border-l border-border bg-background shadow-2xl"
    >
      <header className="flex items-center gap-2 border-b border-border px-4 py-3">
        <Sparkles aria-hidden="true" className="size-5 text-primary" />
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-foreground">Perguntar à IA</h2>
          <p className="text-[11px] text-muted-foreground">Só você vê. Nada é enviado ao cliente.</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          title="Fechar (Esc)"
          className="grid size-9 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </header>
      {preview && (
        <blockquote className="mx-4 mt-3 line-clamp-3 rounded-lg border-l-4 border-primary/50 bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
          {preview.length > PREVIEW_MAX ? `${preview.slice(0, PREVIEW_MAX)}…` : preview}
        </blockquote>
      )}
      <div className="min-h-0 flex-1">
        <ConsultChat
          context={{ conversationId, messageId: focus?.messageId }}
          autoAsk={focus ? AUTO_QUESTION : undefined}
          starters={STARTERS}
          intro="Pergunte sobre esta conversa. A IA usa o mesmo conhecimento da Aline e lê as últimas mensagens. Dá para anexar ou colar um print."
          onUseSuggestion={onUseSuggestion}
        />
      </div>
    </aside>
  );
}
