'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Play, Pause, Loader2, Sparkles, ChevronDown, Check, MicOff } from 'lucide-react';
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import { inboxService, toAbsoluteApiUrl, type Message, type TranscriptionResult } from '../services/inbox.service';
import { getErrorMessage } from '@/lib/errors';

const SPEEDS = [1, 1.25, 1.5, 1.75, 2] as const;

/**
 * Audio player with playback-rate control and on-demand transcription.
 *
 * Why a custom player instead of <audio controls>:
 *   - We need a rate selector in-line with the controls (per-message memory),
 *   - Native controls look different on every OS/browser,
 *   - We want the transcribe button right next to the bubble.
 */
export function AudioMessagePlayer({
  message,
  isOutbound,
  onTranscribed,
}: {
  message: Message;
  isOutbound: boolean;
  onTranscribed?: (t: TranscriptionResult) => void;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [rate, setRate] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The panel always plays a transcoded AAC/M4A rendition, never the raw
  // OGG/Opus that WhatsApp voice notes use — Safari/iOS can't decode Opus, so
  // the <audio> element loads the header but stays silent. We resolve (and
  // cache, server-side) that M4A on first play. If a previous play already
  // cached it, the socket delivers metadata.playback.url and we seed from it.
  const cachedPlaybackUrl = toAbsoluteApiUrl(
    message.metadata?.playback?.url as string | undefined,
  );
  const [resolvedUrl, setResolvedUrl] = useState<string | undefined>(cachedPlaybackUrl);
  const [resolving, setResolving] = useState(false);
  const mediaUrl = resolvedUrl;

  useEffect(() => {
    const cached = toAbsoluteApiUrl(message.metadata?.playback?.url as string | undefined);
    if (cached) setResolvedUrl(cached);
  }, [message.metadata?.playback?.url]);

  const ensureResolved = async (): Promise<string | null> => {
    if (resolvedUrl) return resolvedUrl;
    setResolving(true);
    try {
      const { url } = await inboxService.getPlaybackUrl(message.id);
      setResolvedUrl(url);
      return url;
    } catch (err: any) {
      setError(
        getErrorMessage(err, 'Não foi possível carregar o áudio'),
      );
      return null;
    } finally {
      setResolving(false);
    }
  };

  const [transcribing, setTranscribing] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptionResult | null>(
    message.metadata?.transcription ?? null,
  );
  const [transcribeError, setTranscribeError] = useState<string | null>(null);

  // Sync internal transcript with prop when socket pushes updated metadata.
  useEffect(() => {
    if (message.metadata?.transcription) {
      setTranscript(message.metadata.transcription);
    }
  }, [message.metadata?.transcription]);

  const colorBubble = isOutbound
    ? 'bg-bubble text-bubble-foreground'
    : 'bg-muted text-foreground';
  const colorAccent = isOutbound
    ? 'bg-bubble-foreground/30'
    : 'bg-foreground/15';
  const colorAccentFilled = isOutbound
    ? 'bg-bubble-foreground'
    : 'bg-primary';
  const colorMuted = isOutbound
    ? 'text-bubble-foreground/90'
    : 'text-muted-foreground';

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.playbackRate = rate;
  }, [rate]);

  const handleTogglePlay = async () => {
    setError(null);
    try {
      if (!resolvedUrl) {
        // Lazy-resolve on first play so we don't hit the provider on every
        // audio message in the list (e.g., loading a conversation with 50 audios).
        setLoading(true);
        const url = await ensureResolved();
        if (!url) return;
        // Audio element gets the src on next render — wait a tick before playing.
        await new Promise<void>((r) => requestAnimationFrame(() => r()));
      }
      const audio = audioRef.current;
      if (!audio) return;
      if (audio.paused) {
        setLoading(true);
        try {
          await audio.play();
        } catch (err: any) {
          // A freshly-set src makes the browser abort the first play() while it
          // (re)loads the media — this is the "The operation was aborted" the
          // operator saw on just-sent audio (the message re-renders as the
          // optimistic row reconciles with the server/echo). Retry once after
          // the load settles.
          if (err?.name === 'AbortError') {
            await new Promise<void>((r) => setTimeout(r, 150));
            await audio.play();
          } else {
            throw err;
          }
        }
        setPlaying(true);
      } else {
        audio.pause();
        setPlaying(false);
      }
    } catch (err: any) {
      // AbortError here is a benign reload/re-render race — the user can just
      // tap again; don't surface it as a failure.
      if (err?.name !== 'AbortError') {
        setError(err?.message || 'Erro ao reproduzir áudio');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(audio.duration)) return;
    const pct = Number(e.target.value);
    audio.currentTime = (pct / 100) * audio.duration;
    setCurrentTime(audio.currentTime);
  };

  const progressPct = useMemo(() => {
    if (!duration || !Number.isFinite(duration)) return 0;
    return Math.min(100, (currentTime / duration) * 100);
  }, [currentTime, duration]);

  const handleTranscribe = async () => {
    setTranscribing(true);
    setTranscribeError(null);
    try {
      const result = await inboxService.transcribeAudio(message.id);
      setTranscript(result);
      onTranscribed?.(result);
    } catch (err: any) {
      setTranscribeError(
        getErrorMessage(err, 'Erro ao transcrever'),
      );
    } finally {
      setTranscribing(false);
    }
  };

  // Only bail out if there's no way at all to produce a playback rendition —
  // i.e., no cached playback URL and no source the backend could transcode
  // from (raw mediaUrl/mediaId on the message, or an external id to resolve).
  // Otherwise we render the player and lazy-resolve on first play.
  const hasSource =
    !!mediaUrl ||
    !!message.content?.mediaUrl ||
    !!message.content?.mediaId ||
    !!message.externalId;
  if (!hasSource) {
    return (
      <div className={`rounded-2xl px-4 py-2.5 ${colorBubble}`}>
        <p className="flex items-center gap-1.5 text-sm opacity-90">
          <MicOff aria-hidden="true" className="h-4 w-4 shrink-0" />
          Áudio indisponível
        </p>
      </div>
    );
  }

  return (
    <div className={`w-[240px] max-w-full rounded-2xl px-3 py-2.5 ${colorBubble}`}>
      <audio
        ref={audioRef}
        src={mediaUrl}
        preload="metadata"
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => { setPlaying(false); setCurrentTime(0); }}
        onError={() => setError('Falha ao carregar áudio')}
      />
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleTogglePlay}
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-opacity ${
            isOutbound ? 'bg-bubble-foreground/20 hover:bg-bubble-foreground/30' : 'bg-foreground/10 hover:bg-foreground/15'
          }`}
          aria-label={playing ? 'Pausar áudio' : 'Reproduzir áudio'}
          title={playing ? 'Pausar' : 'Reproduzir'}
        >
          {loading || resolving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : playing ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4 translate-x-[1px]" />
          )}
        </button>

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className={`relative h-1 w-full rounded-full ${colorAccent}`}>
            <div
              className={`absolute inset-y-0 left-0 rounded-full transition-[width] ${colorAccentFilled}`}
              style={{ width: `${progressPct}%` }}
            />
            <input
              type="range"
              min={0}
              max={100}
              step={0.1}
              value={progressPct}
              onChange={handleSeek}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            />
          </div>
          <div className={`flex items-center justify-between font-mono text-[11px] tabular-nums ${colorMuted}`}>
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        <Popover className="relative shrink-0">
          <PopoverButton
            className={`inline-flex h-7 items-center gap-0.5 rounded-md px-2 font-mono text-[11px] font-medium tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              isOutbound
                ? 'bg-bubble-foreground/15 hover:bg-bubble-foreground/25 text-bubble-foreground'
                : 'bg-foreground/10 hover:bg-foreground/15 text-foreground'
            }`}
            aria-label="Velocidade de reprodução"
          >
            {rate}×
            <ChevronDown aria-hidden="true" className="h-3 w-3" />
          </PopoverButton>
          <PopoverPanel
            anchor="bottom end"
            transition
            className="z-50 mt-1 min-w-[80px] rounded-lg border border-border bg-popover p-1 shadow-elevated outline-none transition duration-100 ease-out data-[closed]:scale-95 data-[closed]:opacity-0"
          >
            {({ close }) =>
              SPEEDS.map((s) => (
                <button
                  key={s}
                  onClick={() => { setRate(s); close(); }}
                  className={`flex w-full items-center justify-between rounded-md px-2.5 py-1 text-left text-xs transition-colors ${
                    rate === s
                      ? 'bg-primary/10 font-medium text-primary'
                      : 'text-foreground hover:bg-muted/50'
                  }`}
                >
                  <span className="tabular-nums">{s}×</span>
                  {rate === s && <Check className="h-3 w-3" />}
                </button>
              )) as any
            }
          </PopoverPanel>
        </Popover>
      </div>

      {error && (
        <p className={`mt-1.5 text-[11px] ${isOutbound ? 'text-red-200' : 'text-urgent-ink'}`}>
          {error}
        </p>
      )}

      {/* Transcription area */}
      <div className={`mt-2 flex items-center gap-2 border-t pt-2 ${
        isOutbound ? 'border-bubble-foreground/20' : 'border-border'
      }`}>
        {!transcript && !transcribing && (
          <button
            type="button"
            onClick={handleTranscribe}
            className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium transition-colors ${
              isOutbound
                ? 'text-bubble-foreground/90 hover:bg-bubble-foreground/15'
                : 'text-muted-foreground hover:bg-foreground/10 hover:text-foreground'
            }`}
          >
            <Sparkles className="h-3 w-3" />
            Transcrever
          </button>
        )}
        {transcribing && (
          <span className={`inline-flex items-center gap-1 text-[11px] ${colorMuted}`}>
            <Loader2 className="h-3 w-3 animate-spin" />
            Transcrevendo…
          </span>
        )}
        {transcribeError && (
          <span className={`text-[11px] ${isOutbound ? 'text-red-200' : 'text-urgent-ink'}`}>{transcribeError}</span>
        )}
      </div>

      {transcript?.text && (
        <p className={`mt-1 whitespace-pre-wrap text-sm leading-relaxed ${
          isOutbound ? 'text-bubble-foreground/95' : 'text-foreground'
        }`}>
          {transcript.text}
        </p>
      )}
    </div>
  );
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const total = Math.floor(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
