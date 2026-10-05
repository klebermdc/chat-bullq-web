'use client';

import { use, useEffect, useState } from 'react';
import axios from 'axios';
import { CheckCircle2, MailX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LoadingState } from '@/components/ui/empty-state';

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
    <main className="flex min-h-dvh items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-border bg-card p-6 text-center shadow-soft">
          {state === 'loading' && (
            <LoadingState className="py-12" />
          )}

          {state === 'error' && (
            <>
              <MailX aria-hidden="true" className="mx-auto h-10 w-10 text-muted-foreground" />
              <h1 className="mt-3 text-lg font-semibold text-foreground">
                Link inválido
              </h1>
              <p className="mt-2 text-sm text-balance text-muted-foreground">
                Não conseguimos localizar esse pedido de descadastro. Se você continua
                recebendo nossos emails, responda a mensagem que a gente resolve.
              </p>
            </>
          )}

          {(state === 'ready' || state === 'confirming') && view && (
            <>
              <MailX aria-hidden="true" className="mx-auto h-10 w-10 text-muted-foreground" />
              <h1 className="mt-3 text-lg font-semibold text-foreground">
                Cancelar inscrição
              </h1>
              <p className="mt-2 text-sm text-balance text-muted-foreground">
                Confirma que{' '}
                <span className="break-all font-medium text-foreground">
                  {view.email}
                </span>{' '}
                não deve mais receber nossos emails?
              </p>
              <Button
                type="button"
                size="lg"
                className="mt-6 w-full"
                onClick={handleConfirm}
                loading={state === 'confirming'}
              >
                {state === 'confirming' ? 'Confirmando…' : 'Confirmar'}
              </Button>
            </>
          )}

          {state === 'done' && view && (
            <>
              <CheckCircle2 aria-hidden="true" className="mx-auto h-10 w-10 text-success-ink" />
              <h1 className="mt-3 text-lg font-semibold text-success-ink">
                Inscrição cancelada
              </h1>
              <p className="mt-2 text-sm text-balance text-muted-foreground">
                O endereço{' '}
                <span className="break-all font-medium text-foreground">
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
