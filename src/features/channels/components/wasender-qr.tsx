'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, X, CheckCircle2, RefreshCw, Smartphone } from 'lucide-react';
import { channelsService } from '../services/channels.service';

const CONNECTED_STATES = new Set([
  'connected',
  'open',
  'online',
  'authenticated',
  'ready',
  'active',
]);

/** Converte o campo `qr` do backend numa src de <img>, ou null se for texto cru. */
function qrToImageSrc(qr?: string): string | null {
  if (!qr) return null;
  if (qr.startsWith('data:') || qr.startsWith('http')) return qr;
  // base64 puro (sem prefixo) → assume PNG
  if (/^[A-Za-z0-9+/=]+$/.test(qr) && qr.length > 100) {
    return `data:image/png;base64,${qr}`;
  }
  return null;
}

interface WasenderQrPanelProps {
  channelId: string;
  /** Chamado quando a sessão conecta. */
  onConnected?: () => void;
}

/**
 * Painel de pareamento: dispara o connect, exibe o QR Code e faz polling do
 * status até conectar. O QR é renovado periodicamente (expira no WhatsApp).
 */
export function WasenderQrPanel({ channelId, onConnected }: WasenderQrPanelProps) {
  const [qr, setQr] = useState<string | undefined>();
  const [status, setStatus] = useState<string>('connecting');
  const [error, setError] = useState<string | null>(null);
  const [loadingQr, setLoadingQr] = useState(true);
  const connectedRef = useRef(false);
  const onConnectedRef = useRef(onConnected);
  onConnectedRef.current = onConnected;

  const refreshQr = useCallback(async () => {
    setLoadingQr(true);
    setError(null);
    try {
      const res = await channelsService.getWasenderQr(channelId);
      if (res.success) {
        setQr(res.qr);
      } else {
        setError(res.error || 'Não foi possível obter o QR Code.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao obter o QR Code.');
    } finally {
      setLoadingQr(false);
    }
  }, [channelId]);

  // Dispara connect uma vez, depois busca o primeiro QR.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await channelsService.connectWasender(channelId);
      } catch {
        /* connect é best-effort; o QR/status revelam o estado real */
      }
      if (!cancelled) await refreshQr();
    })();
    return () => {
      cancelled = true;
    };
  }, [channelId, refreshQr]);

  // Poll de status (3s) + renovação do QR (a cada ~20s enquanto desconectado).
  useEffect(() => {
    let ticks = 0;
    const interval = setInterval(async () => {
      if (connectedRef.current) return;
      try {
        const res = await channelsService.getWasenderStatus(channelId);
        const st = (res.status || '').toLowerCase();
        if (res.success && st) setStatus(st);
        if (res.success && CONNECTED_STATES.has(st)) {
          connectedRef.current = true;
          onConnectedRef.current?.();
          clearInterval(interval);
          return;
        }
      } catch {
        /* silencioso — próximo tick tenta de novo */
      }
      ticks += 1;
      if (ticks % 7 === 0 && !connectedRef.current) {
        void refreshQr();
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [channelId, refreshQr]);

  const connected = connectedRef.current || CONNECTED_STATES.has(status);
  const imgSrc = qrToImageSrc(qr);

  if (connected) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <CheckCircle2 className="h-14 w-14 text-green-500" />
        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          Número conectado com sucesso!
        </p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Seu WhatsApp já está pronto para enviar e receber mensagens.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 py-2 text-center">
      <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300">
        <Smartphone className="h-4 w-4" />
        Abra o WhatsApp → Aparelhos conectados → Conectar aparelho
      </div>

      <div className="relative flex h-64 w-64 items-center justify-center rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-700">
        {imgSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imgSrc} alt="QR Code do WhatsApp" className="h-full w-full object-contain" />
        ) : loadingQr ? (
          <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
        ) : qr ? (
          <code className="break-all p-2 text-[10px] text-zinc-500">{qr}</code>
        ) : (
          <p className="px-4 text-xs text-zinc-400">
            {error || 'Aguardando o QR Code do WhatsApp…'}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
        <Loader2 className="h-3 w-3 animate-spin" />
        Aguardando leitura… (status: {status})
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <button
        type="button"
        onClick={refreshQr}
        disabled={loadingQr}
        className="inline-flex items-center gap-1.5 rounded-md bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-200 disabled:opacity-50 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
      >
        <RefreshCw className={`h-3 w-3 ${loadingQr ? 'animate-spin' : ''}`} />
        Atualizar QR
      </button>
    </div>
  );
}

interface WasenderQrDialogProps {
  channelId: string | null;
  onClose: () => void;
  onConnected?: () => void;
}

/** Modal standalone de pareamento — usado pelo botão "Conectar / Reconectar". */
export function WasenderQrDialog({ channelId, onClose, onConnected }: WasenderQrDialogProps) {
  if (!channelId) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-50 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-zinc-900">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Conectar WhatsApp
          </h2>
          <button onClick={onClose} className="rounded-md p-1 text-zinc-400 hover:text-zinc-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-4">
          <WasenderQrPanel
            channelId={channelId}
            onConnected={() => {
              onConnected?.();
            }}
          />
        </div>
      </div>
    </div>
  );
}
