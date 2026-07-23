'use client';

import { useRef, useState } from 'react';
import { Sparkles, Send, Lock } from 'lucide-react';
import { askCopilot, type CopilotTurn } from '@/features/copilot/api';

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
        e?.response?.data?.message ??
        'Não consegui consultar agora. Tenta de novo.';
      setError(typeof msg === 'string' ? msg : 'Erro ao consultar.');
    } finally {
      setLoading(false);
      requestAnimationFrame(() =>
        endRef.current?.scrollIntoView({ behavior: 'smooth' }),
      );
    }
  }

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-3xl flex-col">
      <header className="flex items-center gap-2 px-4 py-4">
        <Sparkles className="size-5 text-violet-600 dark:text-violet-300" />
        <div className="flex-1">
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Copiloto
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Assistente interno de vendas, clientes e funil
          </p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-[11px] font-medium text-violet-700 dark:border-violet-400/30 dark:bg-violet-400/10 dark:text-violet-300">
          <Lock className="size-3" /> Só Proprietário e Admin
        </span>
      </header>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-2">
        {turns.length === 0 && (
          <div className="rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
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
                  ? 'bg-violet-600 text-white'
                  : 'border border-zinc-200 bg-white text-zinc-800 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100'
              }`}
            >
              {t.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900">
              digitando…
            </div>
          </div>
        )}
        {error && <div className="text-sm text-red-500">{error}</div>}
        <div ref={endRef} />
      </div>

      {turns.length === 0 && (
        <div className="flex flex-wrap gap-2 px-4 pb-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => send(s)}
              className="rounded-full border border-zinc-200 px-3 py-1.5 text-xs text-violet-700 transition-colors hover:bg-violet-50 dark:border-zinc-700 dark:text-violet-300 dark:hover:bg-violet-400/10"
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
          className="flex-1 rounded-xl border border-zinc-300 bg-zinc-50 px-4 py-3 text-sm outline-none focus:border-violet-400 dark:border-zinc-700 dark:bg-zinc-900"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          aria-label="Enviar"
          className="grid size-11 place-items-center rounded-xl bg-violet-600 text-white transition-colors hover:bg-violet-700 disabled:opacity-40"
        >
          <Send className="size-4" />
        </button>
      </form>
    </div>
  );
}
