'use client';

import { useState } from 'react';
import { Phone, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { callsService } from '../services/calls.service';
import type { Conversation } from '../services/inbox.service';
import { getErrorMessage } from '@/lib/errors';

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
  hideTrigger,
  confirmOpen,
  onConfirmOpenChange,
}: {
  conversation: Conversation;
  /** Mobile: renderiza como linha de menu (bottom sheet) em vez de ícone. */
  asMenuItem?: boolean;
  /** Chamado após disparar a ligação (ex.: fechar o bottom sheet). */
  onDone?: () => void;
  /** Esconde o ícone (cabeçalho estreito): quem abre o lembrete é o menu "Mais ações". */
  hideTrigger?: boolean;
  /** Controle externo do lembrete — usado junto com `hideTrigger`. */
  confirmOpen?: boolean;
  onConfirmOpenChange?: (open: boolean) => void;
}) {
  const [isCalling, setIsCalling] = useState(false);
  const [localConfirm, setLocalConfirm] = useState(false);
  const showConfirm = confirmOpen ?? localConfirm;
  const setShowConfirm = (open: boolean) => {
    setLocalConfirm(open);
    onConfirmOpenChange?.(open);
  };

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
      toast.error(getErrorMessage(err, 'Não foi possível iniciar a ligação'));
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
        className="flex min-h-11 items-center gap-3 px-4 py-3 text-left text-sm text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring disabled:opacity-50"
      >
        <Phone aria-hidden="true" className={`h-5 w-5 shrink-0 text-muted-foreground ${isCalling ? 'animate-pulse' : ''}`} /> Ligar para o contato
      </button>
    );
  }

  return (
    <>
      {!hideTrigger && (
        <Button
          onClick={() => setShowConfirm(true)}
          disabled={isCalling}
          title="Ligar para o contato"
          aria-label="Ligar para o contato"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground"
        >
          <Phone aria-hidden="true" className={`h-4 w-4 ${isCalling ? 'animate-pulse' : ''}`} />
        </Button>
      )}

      <Dialog
        open={showConfirm}
        // Não fecha enquanto a ligação está sendo disparada (igual ao modal antigo).
        onClose={() => !isCalling && setShowConfirm(false)}
        title="Iniciar ligação"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowConfirm(false)} disabled={isCalling}>
              Cancelar
            </Button>
            <Button onClick={startCall} disabled={isCalling}>
              <Phone aria-hidden="true" className={`h-4 w-4 ${isCalling ? 'animate-pulse' : ''}`} />
              {isCalling ? 'Ligando…' : 'Estou conectado — Ligar'}
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">
          Seu ramal vai tocar primeiro e, quando você atender, a Sonax disca para o
          cliente. <strong className="text-foreground">Você precisa estar conectado ao
          WebVoice</strong> (ramal online) — senão a ligação não toca.
        </p>

        <a
          href={WEBVOICE_URL}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" /> Abrir WebVoice
        </a>
      </Dialog>
    </>
  );
}
