'use client';

import { useState } from 'react';
import { Phone } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { callsService } from '../services/calls.service';
import type { Conversation } from '../services/inbox.service';

/**
 * Botão de click-to-call (Sonax) no header. O ramal do atendente toca
 * primeiro; quando ele atende, a Sonax disca pro cliente. Só aparece em
 * conversas individuais que têm telefone.
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

  if (conversation.isGroup || !conversation.contact?.phone) return null;

  const handleClick = async () => {
    if (isCalling) return;
    if (!window.confirm('Iniciar ligação? Seu ramal Sonax vai tocar primeiro.')) return;
    setIsCalling(true);
    try {
      await callsService.initiate(conversation.id);
      toast.success('Ligação iniciada — seu ramal vai tocar');
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
        onClick={handleClick}
        disabled={isCalling}
        className="flex items-center gap-3 px-4 py-3 text-left text-sm text-foreground hover:bg-muted disabled:opacity-50"
      >
        <Phone className={`h-5 w-5 ${isCalling ? 'animate-pulse' : ''}`} /> Ligar para o contato
      </button>
    );
  }

  return (
    <Button
      onClick={handleClick}
      disabled={isCalling}
      title="Ligar para o contato"
      variant="ghost"
      size="icon"
      className="h-8 w-8 text-muted-foreground"
    >
      <Phone className={`h-3.5 w-3.5 ${isCalling ? 'animate-pulse' : ''}`} />
    </Button>
  );
}
