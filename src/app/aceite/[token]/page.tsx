'use client';

import { use, useEffect, useState } from 'react';
import { publicAcceptancesService } from '@/features/acceptances/services/public-acceptances.service';
import type { PublicAcceptanceView } from '@/features/acceptances/types';

type PageState = 'loading' | 'ready' | 'signing' | 'error';

/** Origem (scheme://host:port) da API, para transformar pdfUrl relativo em absoluto. */
function apiOrigin(): string {
  const base =
    process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
  try {
    return new URL(base).origin;
  } catch {
    return '';
  }
}

/** Torna absoluta a URL do PDF servido pela API (caminho relativo "/api/v1/..."). */
function toAbsolutePdfUrl(url: string | null): string | null {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  return url.startsWith('/') ? `${apiOrigin()}${url}` : url;
}

/* ---------- Ícones (inline SVG, sem dependências externas) ---------- */

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="M7 10l5 5 5-5" />
      <path d="M12 15V3" />
    </svg>
  );
}

export default function AcceptancePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const [view, setView] = useState<PublicAcceptanceView | null>(null);
  const [name, setName] = useState('');
  const [checked, setChecked] = useState(false);
  const [state, setState] = useState<PageState>('loading');
  const [signError, setSignError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    publicAcceptancesService
      .get(token)
      .then((v) => {
        if (!alive) return;
        setView(v);
        setState('ready');
      })
      .catch(() => {
        if (!alive) return;
        setState('error');
      });
    return () => {
      alive = false;
    };
  }, [token]);

  async function handleSign() {
    setSignError(null);
    setState('signing');
    try {
      const signed = await publicAcceptancesService.sign(token, name.trim());
      setView(signed);
      setState('ready');
    } catch (e) {
      const status = (e as { httpStatus?: number })?.httpStatus;
      // 410/409 = o link não é mais válido (expirado/já assinado) → refaz o
      // fetch para exibir o estado real em vez de um erro inline recuperável.
      if (status === 410 || status === 409) {
        try {
          const v = await publicAcceptancesService.get(token);
          setView(v);
          setState('ready');
          return;
        } catch {
          setState('error');
          return;
        }
      }
      setSignError(
        'Não foi possível confirmar agora. Verifique sua conexão e tente novamente.',
      );
      setState('ready');
    }
  }

  return (
    <main className="flex min-h-dvh flex-col items-center bg-gradient-to-b from-indigo-50 via-zinc-50 to-zinc-100 px-4 py-10 text-zinc-900 sm:py-16 dark:from-zinc-950 dark:via-zinc-950 dark:to-black dark:text-zinc-100">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
        {state === 'loading' && (
          <div className="flex flex-1 flex-col items-center justify-center py-24 text-center">
            <span
              className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600 dark:border-zinc-700 dark:border-t-indigo-400"
              aria-hidden="true"
            />
            <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
              Carregando…
            </p>
          </div>
        )}

        {state === 'error' && !view && (
          <StatusCard
            tone="warning"
            title="Link inválido ou expirado"
            message="Peça um novo link ao atendente para confirmar o recebimento."
          />
        )}

        {view && (state === 'ready' || state === 'signing') && (
          <AcceptanceCard
            view={view}
            name={name}
            setName={(v) => {
              setName(v);
              setSignError(null);
            }}
            checked={checked}
            setChecked={(v) => {
              setChecked(v);
              setSignError(null);
            }}
            signing={state === 'signing'}
            signError={signError}
            onSign={handleSign}
          />
        )}

        {/* Erro após já ter carregado a visão (ex.: falha ao assinar) */}
        {view && state === 'error' && (
          <StatusCard
            tone="warning"
            title="Não foi possível concluir"
            message="Tente novamente em instantes ou peça um novo link ao atendente."
          />
        )}

        <TrustFooter />
      </div>
    </main>
  );
}

/* ---------- Rodapé de confiança ---------- */

function TrustFooter() {
  return (
    <p className="mt-8 flex items-center justify-center gap-1.5 px-4 text-center text-xs leading-relaxed text-zinc-400 dark:text-zinc-500">
      <ShieldIcon className="h-3.5 w-3.5 shrink-0" />
      <span>
        Assinatura eletrônica • seus dados são usados apenas para este
        comprovante
      </span>
    </p>
  );
}

/* ---------- Card genérico de status (erros / indisponível) ---------- */

function StatusCard({
  tone,
  title,
  message,
}: {
  tone: 'warning';
  title: string;
  message: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="rounded-3xl bg-white/90 p-8 text-center shadow-sm ring-1 ring-zinc-200 backdrop-blur dark:bg-zinc-900/80 dark:ring-zinc-800"
    >
      <div
        className={
          tone === 'warning'
            ? 'mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400'
            : ''
        }
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-7 w-7"
        >
          <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
          <path d="M12 9v4" />
          <path d="M12 17h.01" />
        </svg>
      </div>
      <h1 className="mt-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
        {title}
      </h1>
      <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">{message}</p>
    </div>
  );
}

function AcceptanceCard({
  view,
  name,
  setName,
  checked,
  setChecked,
  signing,
  signError,
  onSign,
}: {
  view: PublicAcceptanceView;
  name: string;
  setName: (v: string) => void;
  checked: boolean;
  setChecked: (v: boolean) => void;
  signing: boolean;
  signError: string | null;
  onSign: () => void;
}) {
  if (view.status === 'SIGNED') {
    const pdf = toAbsolutePdfUrl(view.pdfUrl);
    return (
      <div
        role="status"
        aria-live="polite"
        className="rounded-3xl bg-white/90 p-8 text-center shadow-sm ring-1 ring-zinc-200 backdrop-blur dark:bg-zinc-900/80 dark:ring-zinc-800"
      >
        <div
          className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 ring-8 ring-emerald-50 dark:bg-emerald-500/15 dark:text-emerald-400 dark:ring-emerald-500/5"
          aria-hidden="true"
        >
          <CheckIcon className="h-8 w-8" />
        </div>
        <h1 className="mt-5 text-xl font-bold text-zinc-900 dark:text-zinc-100">
          Aceite confirmado!
        </h1>
        <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">
          Recebimento registrado com sucesso.
        </p>
        {view.signerName && (
          <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-300">
            Assinado por{' '}
            <span className="font-semibold text-zinc-900 dark:text-zinc-100">
              {view.signerName}
            </span>
          </p>
        )}
        {pdf && (
          <a
            href={pdf}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-3.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700 dark:focus-visible:ring-offset-zinc-900"
          >
            <DownloadIcon className="h-4 w-4" />
            Baixar comprovante (PDF)
          </a>
        )}
      </div>
    );
  }

  if (view.status !== 'PENDING') {
    return (
      <StatusCard
        tone="warning"
        title="Este link não está mais disponível"
        message="Peça um novo link ao atendente para confirmar o recebimento."
      />
    );
  }

  // PENDING
  const canSubmit = checked && name.trim().length >= 2 && !signing;

  return (
    <div className="space-y-5">
      <header className="text-center">
        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-indigo-500 dark:text-indigo-400">
          Confirmação de recebimento
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          {view.organizationName}
        </h1>
      </header>

      {view.termText && (
        <div className="rounded-3xl bg-white/90 p-6 shadow-sm ring-1 ring-zinc-200 backdrop-blur dark:bg-zinc-900/80 dark:ring-zinc-800">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
            {view.termText}
          </p>
        </div>
      )}

      {view.items.length > 0 && (
        <div className="rounded-3xl bg-white/90 p-6 shadow-sm ring-1 ring-zinc-200 backdrop-blur dark:bg-zinc-900/80 dark:ring-zinc-800">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
            Itens recebidos
          </h2>
          <ul className="space-y-3">
            {view.items.map((item, i) => (
              <li key={i} className="flex items-start gap-3">
                <span
                  className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400"
                  aria-hidden="true"
                >
                  <CheckIcon className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {item.description}
                  </p>
                  {(item.qty != null || item.date) && (
                    <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                      {item.qty != null && <>Qtd: {item.qty}</>}
                      {item.qty != null && item.date && ' · '}
                      {item.date && <>{item.date}</>}
                    </p>
                  )}
                  {item.note && (
                    <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                      {item.note}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-3xl bg-white/90 p-6 shadow-sm ring-1 ring-zinc-200 backdrop-blur dark:bg-zinc-900/80 dark:ring-zinc-800">
        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-zinc-200 p-4 transition hover:border-indigo-300 hover:bg-indigo-50/40 has-[:checked]:border-indigo-400 has-[:checked]:bg-indigo-50/60 dark:border-zinc-700 dark:hover:border-indigo-500/50 dark:hover:bg-indigo-500/5 dark:has-[:checked]:border-indigo-500/60 dark:has-[:checked]:bg-indigo-500/10">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            className="mt-0.5 h-5 w-5 shrink-0 rounded-md border-zinc-300 text-indigo-600 focus:ring-indigo-500 dark:border-zinc-600 dark:bg-zinc-800"
          />
          <span className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-200">
            Confirmo que recebi os itens acima e está tudo correto.
          </span>
        </label>

        <div className="mt-5">
          <label
            htmlFor="signer-name"
            className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-200"
          >
            Seu nome completo
          </label>
          <input
            id="signer-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            placeholder="Ex.: Maria Silva"
            className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3.5 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/15 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-indigo-400 dark:focus:ring-indigo-400/20"
          />
        </div>

        {signError && (
          <div
            role="alert"
            aria-live="assertive"
            className="mt-4 flex items-start gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-700 ring-1 ring-amber-100 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mt-0.5 h-4 w-4 shrink-0"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4" />
              <path d="M12 16h.01" />
            </svg>
            <span>{signError}</span>
          </div>
        )}

        <button
          type="button"
          disabled={!canSubmit}
          onClick={onSign}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 py-3.5 text-sm font-semibold text-white shadow-sm shadow-indigo-600/20 transition hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-400 disabled:shadow-none dark:focus-visible:ring-offset-zinc-900 dark:disabled:bg-zinc-800 dark:disabled:text-zinc-600"
        >
          {signing ? (
            <>
              <span
                className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
                aria-hidden="true"
              />
              Confirmando…
            </>
          ) : (
            'Confirmar aceite'
          )}
        </button>
      </div>
    </div>
  );
}
