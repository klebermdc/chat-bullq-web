'use client';

import { Loader2, Sparkles } from 'lucide-react';

/** Retorno da organização, para o atendente saber no que deu. */
export interface VoucherTextFeedback {
  tone: 'ok' | 'warn';
  text: string;
}

interface Props {
  value: string;
  /** `true` enquanto a IA organiza — o botão vira "Organizando…". */
  busy: boolean;
  feedback: VoucherTextFeedback | null;
  disabled: boolean;
  onChange: (value: string) => void;
  onOrganize: () => void;
}

/**
 * Campo para colar o texto do voucher.
 *
 * Existe porque a leitura do PDF é frágil na prática: muito voucher de turismo
 * chega escaneado, sem camada de texto, e a IA lê pouco ou nada. Colar o texto
 * é o caminho confiável — e o PDF continua anexado do mesmo jeito, porque as
 * duas fontes se completam.
 *
 * Só apresentação: quem chama a API e mescla os itens é o diálogo, que é quem
 * conhece a conversa. Mesmo desenho do `voucher-drop-zone`.
 */
export function VoucherTextField({
  value,
  busy,
  feedback,
  disabled,
  onChange,
  onOrganize,
}: Props) {
  const empty = !value.trim();

  return (
    <div>
      <label
        htmlFor="voucher-text"
        className="text-[12px] font-medium text-zinc-700 dark:text-zinc-300"
      >
        Dados do voucher (colar)
      </label>
      <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
        Cole aqui o texto do voucher — parque, datas, localizador, passageiros. Os
        itens se organizam sozinhos.
      </p>

      <textarea
        id="voucher-text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled || busy}
        rows={4}
        placeholder="Ex.: Magic Kingdom — 15/09/2026 — Localizador JTT-1 — Maria Silva, João Silva"
        className="mt-1.5 w-full resize-y rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm outline-none transition-colors placeholder:text-zinc-400 focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
      />

      <div className="mt-1.5 flex items-center justify-between gap-2">
        {/*
          A mensagem fica à esquerda do botão e não some sozinha: o atendente
          precisa poder conferir "3 itens organizados" contra a lista abaixo.
        */}
        <p
          className={`min-w-0 flex-1 truncate text-[11px] ${
            feedback?.tone === 'warn'
              ? 'text-amber-600 dark:text-amber-400'
              : 'text-zinc-500 dark:text-zinc-400'
          }`}
        >
          {feedback?.text ?? ''}
        </p>

        <button
          type="button"
          onClick={onOrganize}
          disabled={disabled || busy || empty}
          className="flex shrink-0 items-center gap-1.5 rounded-md border border-zinc-200 px-2.5 py-1.5 text-[11px] font-medium text-zinc-700 transition-colors hover:border-primary/50 hover:text-primary disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-200"
        >
          {busy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Sparkles className="h-3.5 w-3.5" />
          )}
          {busy ? 'Organizando…' : 'Organizar itens'}
        </button>
      </div>
    </div>
  );
}
