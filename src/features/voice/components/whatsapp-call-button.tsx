'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Phone, PhoneOff } from 'lucide-react';
import { Room, RoomEvent, Track, type Participant, type RemoteTrack } from 'livekit-client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { getErrorMessage } from '@/lib/errors';
import {
  blockedReason,
  callAction,
  checkSellerCall,
  endSellerCall,
  formatDuration,
  permissionSentMessage,
  phaseFromSipStatus,
  PHASE_LABEL,
  requestCallPermission,
  startSellerCall,
  type CallPhase,
} from '../seller-calls';

const CLIENT_IDENTITY = 'cliente';
const SIP_STATUS = 'sip.callStatus';

interface Props {
  conversationId: string;
  contactName: string | null;
  /** Esconde o ícone (topo estreito); a ligação continua podendo ser aberta por `requestId`. */
  hideTrigger?: boolean;
  /** Muda a cada pedido vindo do menu ("Ligar para o contato"). */
  requestId?: number;
}

/** Vendedor liga para o cliente pelo WhatsApp; o áudio é o do navegador (microfone/headset). */
export function WhatsAppCallButton({ conversationId, contactName, hideTrigger, requestId }: Props) {
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<CallPhase | null>(null);
  const [muted, setMuted] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const roomRef = useRef<Room | null>(null);
  const roomNameRef = useRef<string | null>(null);
  const audioEls = useRef<HTMLMediaElement[]>([]);

  const cleanup = useCallback(async (notifyServer: boolean) => {
    const room = roomRef.current;
    const roomName = roomNameRef.current;
    roomRef.current = null;
    roomNameRef.current = null;
    audioEls.current.forEach((el) => el.remove());
    audioEls.current = [];
    if (room) await room.disconnect().catch(() => undefined);
    if (notifyServer && roomName) await endSellerCall(conversationId, roomName).catch(() => undefined);
  }, [conversationId]);

  // Sair da página/conversa encerra a ligação.
  useEffect(() => () => void cleanup(true), [cleanup]);

  useEffect(() => {
    if (phase !== 'em_ligacao') return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [phase]);

  const hangUp = useCallback(async () => {
    setPhase('encerrada');
    await cleanup(true);
    setTimeout(() => setPhase(null), 1500);
  }, [cleanup]);

  const connect = useCallback(async () => {
    const access = await startSellerCall(conversationId);
    const room = new Room({ adaptiveStream: false, dynacast: false });
    roomRef.current = room;
    roomNameRef.current = access.room;
    const update = (p: Participant) => {
      if (p.identity !== CLIENT_IDENTITY) return;
      const next = phaseFromSipStatus(p.attributes[SIP_STATUS], true);
      setPhase(next);
      if (next === 'encerrada') void hangUp();
    };
    room
      .on(RoomEvent.ParticipantConnected, update)
      .on(RoomEvent.ParticipantAttributesChanged, (_changed, p) => update(p))
      .on(RoomEvent.ParticipantDisconnected, (p) => {
        if (p.identity === CLIENT_IDENTITY) void hangUp();
      })
      .on(RoomEvent.TrackSubscribed, (track: RemoteTrack) => {
        if (track.kind !== Track.Kind.Audio) return;
        const el = track.attach();
        document.body.appendChild(el);
        audioEls.current.push(el);
      })
      .on(RoomEvent.Disconnected, () => {
        if (roomRef.current) void hangUp();
      });
    await room.connect(access.url, access.token);
    await room.localParticipant.setMicrophoneEnabled(true);
    room.remoteParticipants.forEach(update);
  }, [conversationId, hangUp]);

  const begin = useCallback(async () => {
    if (busy || phase) return;
    setBusy(true);
    try {
      const state = await checkSellerCall(conversationId);
      const action = callAction(state);
      if (action === 'AVISAR') {
        toast.error(blockedReason(state));
        return;
      }
      if (action === 'PEDIR_PERMISSAO') {
        await requestCallPermission(conversationId);
        toast.success(permissionSentMessage(contactName));
        return;
      }
      setSeconds(0);
      setMuted(false);
      setPhase('conectando');
      await connect();
    } catch (err) {
      setPhase(null);
      await cleanup(true);
      toast.error(getErrorMessage(err, 'Não foi possível ligar pelo WhatsApp.'));
    } finally {
      setBusy(false);
    }
  }, [busy, phase, conversationId, contactName, connect, cleanup]);

  // Pedido vindo do menu do topo.
  const lastRequest = useRef(requestId);
  useEffect(() => {
    if (requestId === undefined || requestId === lastRequest.current) return;
    lastRequest.current = requestId;
    void begin();
  }, [requestId, begin]);

  const toggleMute = async () => {
    const room = roomRef.current;
    if (!room) return;
    await room.localParticipant.setMicrophoneEnabled(muted);
    setMuted(!muted);
  };

  return (
    <>
      {!hideTrigger && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => void begin()}
          disabled={busy || !!phase}
          title="Ligar pelo WhatsApp (sem permissão do cliente, envia o pedido)"
          aria-label="Ligar pelo WhatsApp"
        >
          <Phone className="size-4" />
        </Button>
      )}
      {phase && (
        <div
          role="dialog"
          aria-label="Ligação pelo WhatsApp"
          className="fixed bottom-4 right-4 z-50 w-72 rounded-xl border border-border bg-background p-4 shadow-lg"
        >
          <p className="truncate font-semibold">{contactName ?? 'Cliente'}</p>
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {PHASE_LABEL[phase]}
            {phase === 'em_ligacao' && ` · ${formatDuration(seconds)}`}
          </p>
          {phase !== 'encerrada' && (
            <div className="mt-3 flex gap-2">
              <Button variant="outline" size="sm" onClick={() => void toggleMute()} disabled={phase !== 'em_ligacao'} aria-pressed={muted}>
                {muted ? <MicOff className="size-4" /> : <Mic className="size-4" />}
                {muted ? 'Ativar microfone' : 'Mudo'}
              </Button>
              <Button variant="destructive" size="sm" onClick={() => void hangUp()}>
                <PhoneOff className="size-4" />
                Desligar
              </Button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
