'use client';

import { useRef, useState } from 'react';
import { Sparkles, Send, Lock } from 'lucide-react';
import { askCopilot, type CopilotTurn } from '@/features/copilot/api';
import { getErrorMessage } from '@/lib/errors';
import { controlCls } from '@/components/ui/control';

const SUGGESTIONS = [
  'Quantas vendas o Pedro fez em julho?',
  'Como está o funil Vendas OFP?',
  'Ranking de vendas do mês',
];

export function CopilotChat() {
  const [turns, setTurns] = useState<CopilotTurn[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  async function send(text: string) {
    const q = text.trim();
    if (!q || loading) return;
    setError(null);
    setInput('');
    const history = turns.slice(-10);
    setTurns((t) => [...t, { role: 'user', content: q }]);
    setLoading(true);
    try {
      const reply = await askCopilot(q, history);
      setTurns((t) => [...t, { role: 'assistant', content: reply }]);
    } catch (e: any) {
      const msg =
        getErrorMessage(e, 'Não consegui consultar agora. Tenta de novo.');
      setError(msg);
    } finally {
      setLoading(false);
      requestAnimationFrame(() =>
        endRef.current?.scrollIntoView({ behavior: 'smooth' }),
      );
    }
  }

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-3xl flex-col">
      <header className="flex flex-wrap items-center gap-2 px-4 py-4">
        <Sparkles className="size-5 text-primary" />
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Copiloto
          </h1>
          <p className="text-xs text-muted-foreground">
            Assistente interno de vendas, clientes e funil
          </p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">
          <Lock className="size-3" /> Só Proprietário e Admin
        </span>
      </header>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-2">
        {turns.length === 0 && (
          <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground shadow-soft">
            Oi! 👋 Pergunta sobre <b>vendas</b>, <b>clientes</b> ou o <b>funil</b>.
          </div>
        )}
        {turns.map((t, i) => (
          <div
            key={i}
            className={
              t.role === 'user' ? 'flex justify-end' : 'flex justify-start'
            }
          >
            <div
              className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm ${
                t.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'border border-border bg-card text-foreground'
              }`}
            >
              {t.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div role="status" className="rounded-2xl border border-border bg-card px-4 py-2.5 text-sm text-muted-foreground">
              Pensando…
            </div>
          </div>
        )}
        {error && (
          <div role="alert" className="rounded-lg bg-urgent-wash px-3 py-2 text-sm text-urgent-ink">
            {error}
          </div>
        )}
        <div ref={endRef} />
      </div>

      {turns.length === 0 && (
        <div className="flex flex-wrap gap-2 px-4 pb-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => send(s)}
              type="button"
              className="min-h-9 rounded-full border border-border px-3 py-1.5 text-left text-xs text-primary transition-colors hover:bg-primary/10"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex items-center gap-2 px-4 py-4"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Pergunte ao Copiloto…"
          aria-label="Pergunta para o Copiloto"
          className={`${controlCls} h-11 min-w-0 flex-1 rounded-xl px-4`}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          aria-label="Enviar pergunta"
          title="Enviar pergunta"
          className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          <Send className="size-4" />
        </button>
      </form>
    </div>
  );
}
