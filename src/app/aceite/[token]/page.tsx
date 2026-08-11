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
    <main className="aceite-root">
      <div className="aceite-sheet">
        {state === 'loading' && <LoadingDocument />}

        {state === 'error' && !view && (
          <Notice
            title="Link inválido ou expirado"
            lead="Peça um novo ao atendente."
          />
        )}

        {view && (state === 'ready' || state === 'signing') && (
          <AcceptanceDocument
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
          <Notice
            organizationName={view.organizationName}
            title="Não foi possível concluir"
            lead="Tente novamente em instantes ou peça ajuda ao atendente."
          />
        )}
      </div>
    </main>
  );
}

/*
  Enquanto o documento não chega, a página já anuncia o formato dele: uns
  poucos fios no lugar das caixas cinzas de esqueleto. Quem abre no 4G do
  estacionamento do parque vê algo calmo, não um placeholder piscando.
*/
function LoadingDocument() {
  return (
    <div role="status">
      <p className="aceite-loading">Carregando…</p>
      <div className="aceite-skeleton" aria-hidden>
        <span />
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}

/*
  Link expirado, cancelado ou erro de rede: quem abre isso também é cliente,
  e merece a mesma tipografia de quem chegou na hora certa. Mesmo cabeçalho,
  mesmo respiro — só o conteúdo é outro.
*/
function Notice({
  organizationName,
  title,
  lead,
}: {
  organizationName?: string;
  title: string;
  lead: string;
}) {
  return (
    <div className="aceite-reveal">
      {organizationName && <p className="aceite-eyebrow">{organizationName}</p>}
      <h1 className="aceite-title aceite-title--notice">{title}</h1>
      <p className="aceite-lead">{lead}</p>
    </div>
  );
}

/** Selo de confirmado. Desenhado (não emoji) para herdar o verde do sistema. */
function CheckMark() {
  return (
    <svg
      className="aceite-mark"
      viewBox="0 0 44 44"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden
    >
      <circle cx="22" cy="22" r="21" />
      <path d="M13 22.5 19.5 29 31 16" strokeLinecap="round" />
    </svg>
  );
}

/** Ícone de documento na linha do voucher. */
function DocumentIcon() {
  return (
    <svg
      className="aceite-voucher-icon"
      viewBox="0 0 18 18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      aria-hidden
    >
      <path d="M4 1.5h6.5L14.5 5.5V16.5H4z" strokeLinejoin="round" />
      <path d="M10.5 1.5V5.5h4" strokeLinejoin="round" />
    </svg>
  );
}

function AcceptanceDocument({
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
      <div className="aceite-reveal">
        <p className="aceite-eyebrow">{view.organizationName}</p>
        <CheckMark />
        <h1 className="aceite-title aceite-title--notice aceite-title--success">
          Aceite confirmado!
        </h1>
        {view.signerName && (
          <p className="aceite-lead">
            Assinado por <strong>{view.signerName}</strong>
          </p>
        )}
        {pdf && (
          <a
            href={pdf}
            target="_blank"
            rel="noopener noreferrer"
            className="aceite-action aceite-action--success"
          >
            Baixar comprovante (PDF)
          </a>
        )}
      </div>
    );
  }

  if (view.status !== 'PENDING') {
    return (
      <Notice
        organizationName={view.organizationName}
        title="Este link não está mais disponível"
        lead="Peça um novo ao atendente."
      />
    );
  }

  // PENDING
  const canSubmit = checked && name.trim().length >= 2 && !signing;

  // Política só existe se a org configurou uma. Testamos o texto já aparado
  // porque uma política " " (só espaço) renderizaria uma seção vazia — pior que
  // não mostrar nada, já que sugere que faltou carregar alguma coisa.
  const policyText = view.policyText?.trim() ?? '';

  // O que o cliente marca precisa cobrir a política, senão o comprovante prova
  // só que ela ESTAVA NA TELA — e "estava exposto" é bem mais fraco que "foi
  // aceito" quando o PDF vira prova numa disputa. O texto espelha a linha que o
  // backend imprime no bloco de assinatura ("Declarou ter lido e aceito a
  // política de cancelamento acima"): as duas pontas contam a mesma história.
  //
  // Condicional de propósito: sem política exibida, o cliente não pode declarar
  // que aceitou uma — seria aceite de algo que ele nunca viu.
  const confirmationLabel = policyText
    ? 'Confirmo que conferi os itens acima e está tudo correto, e que li e aceito a política de cancelamento.'
    : 'Confirmo que conferi os itens acima e está tudo correto.';

  return (
    <div className="aceite-reveal">
      <header>
        <p className="aceite-eyebrow">{view.organizationName}</p>
        <h1 className="aceite-title">Confirmação de entrega</h1>
        {view.orderRef && (
          <p className="aceite-orderref">Pedido {view.orderRef}</p>
        )}
      </header>

      {view.termText && (
        <section className="aceite-block">
          <h2 className="sr-only">Termo de conferência</h2>
          <p className="aceite-prose">{view.termText}</p>
        </section>
      )}

      {view.items.length > 0 && (
        <section className="aceite-block">
          <h2 className="aceite-label">Itens entregues</h2>
          <ul className="aceite-items">
            {view.items.map((item, i) => (
              <li key={i} className="aceite-item">
                <p className="aceite-item-name">{item.description}</p>
                {(item.qty != null || item.date) && (
                  <p className="aceite-item-meta">
                    {item.qty != null && <>Qtd: {item.qty}</>}
                    {item.qty != null && item.date && ' · '}
                    {item.date && <>{item.date}</>}
                  </p>
                )}
                {item.note && <p className="aceite-item-note">{item.note}</p>}
                {/*
                  Passageiros são DETALHE DO ITEM, não itens irmãos: recuados e
                  com o filete à esquerda, o olho lê "quem vai neste ingresso" e
                  não "mais uma coisa que recebi". Sem passageiros, nada muda.

                  Vale a pena o espaço na tela porque ingresso nominal com nome
                  errado é problema no portão do parque — é o tipo de coisa que
                  o cliente tem que conferir de relance, antes de assinar.
                */}
                {(item.passengers?.length ?? 0) > 0 && (
                  <ul className="aceite-pax">
                    {(item.passengers ?? []).map((p, k) => (
                      <li key={k}>
                        {p.name}
                        {p.birthDate && (
                          <span className="aceite-pax-birth">
                            {' '}
                            · {p.birthDate}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {view.vouchers.length > 0 && (
        <section className="aceite-block">
          <h2 className="aceite-label">Seus vouchers</h2>
          <p className="aceite-hint">Abra e confira antes de confirmar.</p>
          <ul className="aceite-vouchers">
            {view.vouchers.map((v, i) => (
              <li key={`${v.url}-${i}`}>
                <a
                  href={v.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="aceite-voucher"
                >
                  <DocumentIcon />
                  <span className="aceite-voucher-name">{v.filename}</span>
                  <span className="aceite-voucher-action">abrir</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/*
        Fica aqui, entre o que o cliente recebeu e o bloco de assinatura, porque
        essa é a ordem do raciocínio de quem assina: declaração (o termo) → o que
        recebi (itens e vouchers) → sob quais condições (isto) → assino. Acima
        dos itens, ~900 caracteres de texto jurídico enterrariam justamente o que
        o cliente precisa conferir, que é a razão da página existir.

        Mesmo corpo do termo: condição de cancelamento em letra menor é
        indefensável se alguém questionar se foi apresentada com clareza. A
        hierarquia vem da cor, não do tamanho. `whitespace: pre-wrap` (na folha)
        preserva as quebras do texto salvo pelo dono — sem isso a política vira
        um paredão ilegível no celular.
      */}
      {policyText && (
        <section className="aceite-block">
          <h2 className="aceite-label">Política de cancelamento</h2>
          <p className="aceite-prose aceite-prose--secondary">{policyText}</p>
        </section>
      )}

      <section className="aceite-sign">
        <h2 className="sr-only">Assinatura</h2>
        <label className="aceite-check">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
          />
          <span>{confirmationLabel}</span>
        </label>

        <div className="aceite-field">
          <label htmlFor="signer-name" className="aceite-field-label">
            Seu nome completo
          </label>
          <input
            id="signer-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            placeholder="Ex.: Maria Silva"
            className="aceite-input"
          />
        </div>

        {signError && (
          <p className="aceite-error" role="alert">
            {signError}
          </p>
        )}

        <button
          type="button"
          disabled={!canSubmit}
          onClick={onSign}
          className="aceite-action"
        >
          {signing ? 'Confirmando…' : 'Confirmar aceite'}
        </button>
      </section>
    </div>
  );
}
