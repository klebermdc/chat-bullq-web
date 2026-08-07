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
    <main className="min-h-dvh bg-zinc-50 px-4 py-8 text-zinc-900 sm:py-12">
      <div className="mx-auto w-full max-w-md">
        {state === 'loading' && (
          <p className="py-24 text-center text-zinc-500">Carregando…</p>
        )}

        {state === 'error' && !view && (
          <div className="rounded-2xl bg-white p-6 text-center shadow-sm ring-1 ring-zinc-200">
            <p className="text-lg font-semibold text-zinc-900">
              Link inválido ou expirado
            </p>
            <p className="mt-2 text-sm text-zinc-600">
              Peça um novo ao atendente.
            </p>
          </div>
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
          <div className="rounded-2xl bg-white p-6 text-center shadow-sm ring-1 ring-zinc-200">
            <p className="text-lg font-semibold text-zinc-900">
              Não foi possível concluir
            </p>
            <p className="mt-2 text-sm text-zinc-600">
              Tente novamente em instantes ou peça ajuda ao atendente.
            </p>
          </div>
        )}
      </div>
    </main>
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
      <div className="rounded-2xl bg-white p-6 text-center shadow-sm ring-1 ring-zinc-200">
        <p className="text-2xl">✅</p>
        <h1 className="mt-2 text-xl font-semibold text-emerald-700">
          Aceite confirmado!
        </h1>
        {view.signerName && (
          <p className="mt-2 text-sm text-zinc-600">
            Assinado por <span className="font-medium">{view.signerName}</span>
          </p>
        )}
        {pdf && (
          <a
            href={pdf}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            Baixar comprovante (PDF)
          </a>
        )}
      </div>
    );
  }

  if (view.status !== 'PENDING') {
    return (
      <div className="rounded-2xl bg-white p-6 text-center shadow-sm ring-1 ring-zinc-200">
        <p className="text-lg font-semibold text-zinc-900">
          Este link não está mais disponível
        </p>
        <p className="mt-2 text-sm text-zinc-600">
          Peça um novo ao atendente.
        </p>
      </div>
    );
  }

  // PENDING
  const canSubmit = checked && name.trim().length >= 2 && !signing;

  // Política só existe se a org configurou uma. Testamos o texto já aparado
  // porque uma política " " (só espaço) renderizaria um cartão vazio — pior que
  // não mostrar nada, já que sugere que faltou carregar alguma coisa.
  const policyText = view.policyText?.trim() ?? '';

  return (
    <div className="space-y-5">
      <header className="text-center">
        <h1 className="text-xl font-bold text-zinc-900">
          {view.organizationName}
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Confirmação de entrega
          {view.orderRef ? ` · Pedido ${view.orderRef}` : ''}
        </p>
      </header>

      {view.termText && (
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-zinc-200">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-700">
            {view.termText}
          </p>
        </div>
      )}

      {view.items.length > 0 && (
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-zinc-200">
          <h2 className="mb-3 text-sm font-semibold text-zinc-900">
            Itens entregues
          </h2>
          <ul className="divide-y divide-zinc-100">
            {view.items.map((item, i) => (
              <li key={i} className="py-3 first:pt-0 last:pb-0">
                <p className="text-sm font-medium text-zinc-900">
                  {item.description}
                </p>
                {(item.qty != null || item.date) && (
                  <p className="mt-0.5 text-xs text-zinc-500">
                    {item.qty != null && <>Qtd: {item.qty}</>}
                    {item.qty != null && item.date && ' · '}
                    {item.date && <>{item.date}</>}
                  </p>
                )}
                {item.note && (
                  <p className="mt-0.5 text-xs text-zinc-500">{item.note}</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {view.vouchers.length > 0 && (
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-zinc-200">
          <h2 className="mb-1 text-sm font-semibold text-zinc-900">
            Seus vouchers
          </h2>
          <p className="mb-3 text-xs text-zinc-500">
            Abra e confira antes de confirmar.
          </p>
          <ul className="space-y-2">
            {view.vouchers.map((v, i) => (
              <li key={`${v.url}-${i}`}>
                <a
                  href={v.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-3 text-sm font-medium text-zinc-800 transition-colors hover:border-zinc-300 hover:bg-zinc-50"
                >
                  <span aria-hidden>📄</span>
                  <span className="min-w-0 flex-1 truncate">{v.filename}</span>
                  <span className="shrink-0 text-xs text-zinc-400">abrir</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/*
        Fica aqui, entre o que o cliente recebeu e a caixa de assinatura, porque
        essa é a ordem do raciocínio de quem assina: declaração (o termo) → o que
        recebi (itens e vouchers) → sob quais condições (isto) → assino. Acima
        dos itens, ~900 caracteres de texto jurídico enterrariam justamente o que
        o cliente precisa conferir, que é a razão da página existir.

        Corpo em `text-sm`, igual ao termo: condição de cancelamento em letra
        menor é indefensável se alguém questionar se foi apresentada com clareza.
        A hierarquia vem da cor (`zinc-600` contra `zinc-700` do termo), não do
        tamanho. `whitespace-pre-wrap` preserva as quebras do texto salvo pelo
        dono — sem isso a política vira um paredão ilegível no celular.
      */}
      {policyText && (
        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-zinc-200">
          <h2 className="mb-2 text-sm font-semibold text-zinc-900">
            Política de cancelamento
          </h2>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-600">
            {policyText}
          </p>
        </section>
      )}

      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-zinc-200">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            className="mt-0.5 h-5 w-5 shrink-0 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
          />
          <span className="text-sm text-zinc-700">
            Confirmo que conferi os itens acima e está tudo correto.
          </span>
        </label>

        <div className="mt-4">
          <label
            htmlFor="signer-name"
            className="mb-1.5 block text-sm font-medium text-zinc-700"
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
            className="w-full rounded-xl border border-zinc-300 px-3 py-3 text-sm text-zinc-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
          />
        </div>

        {signError && (
          <p className="mt-4 text-sm text-red-600">{signError}</p>
        )}

        <button
          type="button"
          disabled={!canSubmit}
          onClick={onSign}
          className="mt-5 w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-zinc-300"
        >
          {signing ? 'Confirmando…' : 'Confirmar aceite'}
        </button>
      </div>
    </div>
  );
}
