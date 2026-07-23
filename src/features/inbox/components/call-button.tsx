'use client';

import { useState } from 'react';
import { Phone, ExternalLink, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { callsService } from '../services/calls.service';
import type { Conversation } from '../services/inbox.service';

/** Portal do agente Sonax (WebVoice) — onde o atendente registra o ramal e atende/desliga. */
const WEBVOICE_URL = 'https://agente.sonax.net.br/';

/**
 * Botão de click-to-call (Sonax) no header. O ramal do atendente toca
 * primeiro; quando ele atende, a Sonax disca pro cliente. Só aparece em
 * conversas individuais que têm telefone.
 *
 * Ao clicar, abre um lembrete: o ramal PRECISA estar online no WebVoice, senão
 * a ligação não toca (a Sonax fica esperando o ramal e a chamada não completa).
 */
export function CallButton({
  conversation,
  asMenuItem,
  onDone,
}: {
  conversation: Conversation;
  /** Mobile: renderiza como linha de menu (bottom sheet) em vez de ícone. */
  asMenuItem?: boolean;
  /** Chamado após disparar a ligação (ex.: fechar o bottom sheet). */
  onDone?: () => void;
}) {
  const [isCalling, setIsCalling] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  if (conversation.isGroup || !conversation.contact?.phone) return null;

  const startCall = async () => {
    if (isCalling) return;
    setIsCalling(true);
    try {
      await callsService.initiate(conversation.id);
      toast.success('Ligação iniciada — seu ramal (WebVoice) vai tocar');
      setShowConfirm(false);
      onDone?.();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Não foi possível iniciar a ligação');
    } finally {
      setIsCalling(false);
    }
  };

  if (asMenuItem) {
    return (
      <button
        type="button"
        onClick={startCall}
        disabled={isCalling}
        className="flex items-center gap-3 px-4 py-3 text-left text-sm text-foreground hover:bg-muted disabled:opacity-50"
      >
        <Phone className={`h-5 w-5 ${isCalling ? 'animate-pulse' : ''}`} /> Ligar para o contato
      </button>
    );
  }

  return (
    <>
      <Button
        onClick={() => setShowConfirm(true)}
        disabled={isCalling}
        title="Ligar para o contato"
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground"
      >
        <Phone className={`h-3.5 w-3.5 ${isCalling ? 'animate-pulse' : ''}`} />
      </Button>

      {showConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => !isCalling && setShowConfirm(false)}
        >
          <div
            className="w-full max-w-sm rounded-xl border border-border bg-card p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-base font-semibold text-foreground">
                <Phone className="h-4 w-4 text-emerald-600" /> Iniciar ligação
              </h3>
              <button
                type="button"
                onClick={() => !isCalling && setShowConfirm(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-sm text-muted-foreground">
              Seu ramal vai tocar primeiro e, quando você atender, a Sonax disca para o
              cliente. <strong className="text-foreground">Você precisa estar conectado ao
              WebVoice</strong> (ramal online) — senão a ligação não toca.
            </p>

            <a
              href={WEBVOICE_URL}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700 hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Abrir WebVoice
            </a>

            <div className="mt-5 flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => setShowConfirm(false)}
                disabled={isCalling}
              >
                Cancelar
              </Button>
              <Button onClick={startCall} disabled={isCalling} className="gap-1.5">
                <Phone className={`h-4 w-4 ${isCalling ? 'animate-pulse' : ''}`} />
                {isCalling ? 'Ligando…' : 'Estou conectado — Ligar'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
