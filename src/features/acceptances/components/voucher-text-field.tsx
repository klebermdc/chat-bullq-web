'use client';

import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { controlCls } from '@/components/ui/control';

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
 * Campo para colar o texto do voucher — a única fonte automática dos itens.
 *
 * Já houve uma segunda: a IA lia o PDF anexado. Ela trazia para a lista o que
 * estava escrito no voucher, inclusive em inglês, e num documento que o cliente
 * ASSINA isso é ruído, não ajuda. Ficou só o texto colado, que passou pelos
 * olhos do atendente. O PDF continua anexado e vai ao cliente — só não é lido.
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
        className="block text-sm font-medium text-foreground"
      >
        Dados do voucher (colar)
      </label>
      <p className="mt-0.5 text-xs text-muted-foreground">
        Cole aqui o texto do voucher — parque, datas, localizador, passageiros. É
        daqui que saem os itens da lista abaixo; o PDF anexado não é lido.
      </p>

      <textarea
        id="voucher-text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled || busy}
        rows={4}
        placeholder="Ex.: Magic Kingdom — 15/09/2026 — Localizador JTT-1 — Maria Silva, João Silva"
        className={`${controlCls} mt-1.5 h-auto w-full resize-y py-2`}
      />

      <div className="mt-1.5 flex items-start justify-between gap-2">
        {/*
          A mensagem fica à esquerda do botão e não some sozinha: o atendente
          precisa poder conferir "3 itens organizados" contra a lista abaixo.
        */}
        <p
          role="status"
          title={feedback?.text}
          className={`min-w-0 flex-1 text-xs ${
            feedback?.tone === 'warn' ? 'text-warning-ink' : 'text-muted-foreground'
          }`}
        >
          {feedback?.text ?? ''}
        </p>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onOrganize}
          disabled={disabled || empty}
          loading={busy}
          className="shrink-0"
        >
          {!busy && <Sparkles aria-hidden="true" className="h-3.5 w-3.5" />}
          {busy ? 'Organizando…' : 'Organizar itens'}
        </Button>
      </div>
    </div>
  );
}
