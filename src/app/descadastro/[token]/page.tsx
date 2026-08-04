'use client';

import { use, useEffect, useState } from 'react';
import axios from 'axios';
import { CheckCircle2, MailX } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

type PageState = 'loading' | 'ready' | 'confirming' | 'done' | 'error';

interface UnsubscribeView {
  email: string;
  status: string;
}

async function fetchUnsubscribe(token: string): Promise<UnsubscribeView> {
  const res = await axios.get(`${API_URL}/public/unsubscribe/${token}`);
  return res.data.data;
}

async function confirmUnsubscribe(token: string): Promise<UnsubscribeView> {
  const res = await axios.post(`${API_URL}/public/unsubscribe/${token}`);
  return res.data.data;
}

export default function DescadastroPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const [view, setView] = useState<UnsubscribeView | null>(null);
  const [state, setState] = useState<PageState>('loading');

  useEffect(() => {
    let alive = true;
    fetchUnsubscribe(token)
      .then((v) => {
        if (!alive) return;
        setView(v);
        setState(v.status === 'UNSUBSCRIBED' ? 'done' : 'ready');
      })
      .catch(() => {
        if (!alive) return;
        setState('error');
      });
    return () => {
      alive = false;
    };
  }, [token]);

  async function handleConfirm() {
    setState('confirming');
    try {
      const v = await confirmUnsubscribe(token);
      setView(v);
      setState('done');
    } catch {
      setState('error');
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-zinc-50 px-4 py-8 dark:bg-zinc-950">
      <div className="w-full max-w-md">
        <div className="rounded-2xl bg-white p-6 text-center shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
          {state === 'loading' && (
            <p className="py-12 text-sm text-zinc-500 dark:text-zinc-400">Carregando…</p>
          )}

          {state === 'error' && (
            <>
              <MailX className="mx-auto h-10 w-10 text-zinc-400 dark:text-zinc-600" />
              <h1 className="mt-3 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                Link inválido
              </h1>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                Não conseguimos localizar esse pedido de descadastro. Se você continua
                recebendo nossos emails, responda a mensagem que a gente resolve.
              </p>
            </>
          )}

          {(state === 'ready' || state === 'confirming') && view && (
            <>
              <MailX className="mx-auto h-10 w-10 text-zinc-400 dark:text-zinc-600" />
              <h1 className="mt-3 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                Cancelar inscrição
              </h1>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                Confirma que{' '}
                <span className="font-medium text-zinc-900 dark:text-zinc-100">
                  {view.email}
                </span>{' '}
                não deve mais receber nossos emails?
              </p>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={state === 'confirming'}
                className="mt-6 w-full rounded-xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                {state === 'confirming' ? 'Confirmando…' : 'Confirmar'}
              </button>
            </>
          )}

          {state === 'done' && view && (
            <>
              <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600 dark:text-emerald-400" />
              <h1 className="mt-3 text-lg font-semibold text-emerald-700 dark:text-emerald-400">
                Inscrição cancelada
              </h1>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                O endereço{' '}
                <span className="font-medium text-zinc-900 dark:text-zinc-100">
                  {view.email}
                </span>{' '}
                foi removido da nossa lista. Você não vai mais receber nossos emails.
              </p>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
