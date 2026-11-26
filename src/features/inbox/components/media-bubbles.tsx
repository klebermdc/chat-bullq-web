'use client';

import { useEffect, useState } from 'react';
import {
  Loader2,
  AlertCircle,
  Download,
  FileText,
  FileArchive,
  FileSpreadsheet,
  FileImage,
  FileVideo,
  FileAudio,
  File as FileIcon,
  MapPin,
  X,
} from 'lucide-react';
import { useResolvedMedia } from '../hooks/use-resolved-media';
import type { Message } from '../services/inbox.service';
import { documentTypeLabel } from '../lib/media-kind';
import { downloadMedia, mediaDownloadName, type DownloadKind } from '../lib/media-download';

/**
 * One file, all media bubbles. They share three concerns: lazy-resolve a
 * playable URL via /messages/:id/media, fall back gracefully when the
 * provider's URL expires, and keep visual styling consistent with the
 * surrounding chat bubble.
 */

interface MediaProps {
  message: Message;
  isOutbound: boolean;
}

export function MediaImage({ message, isOutbound }: MediaProps) {
  // Eager: imagem aparece assim que a mensagem renderiza, sem precisar de
  // clique pra disparar o resolve.
  const { url, loading, error, retry } = useResolvedMedia(message, { mode: 'eager' });
  const [zoomOpen, setZoomOpen] = useState(false);
  const caption = message.content?.caption as string | undefined;
  const downloadName = downloadNameFor(message, 'IMAGE');

  return (
    <div>
      <div
        className={`group relative overflow-hidden rounded-xl ${
          isOutbound ? 'bg-bubble-foreground/10' : 'bg-muted'
        }`}
        style={{ minHeight: '120px', minWidth: '160px' }}
      >
        {url ? (
          <button
            type="button"
            onClick={() => setZoomOpen(true)}
            className="block max-w-full"
            aria-label="Abrir imagem"
          >
            <img
              src={url}
              alt={caption || 'Imagem'}
              className="max-h-72 max-w-full rounded-xl object-contain"
              onError={() => void retry()}
              loading="lazy"
            />
          </button>
        ) : (
          <MediaSkeleton
            label={loading ? 'Carregando imagem…' : error || 'Imagem'}
            error={!!error}
            isOutbound={isOutbound}
            onRetry={() => void retry()}
          />
        )}
        {url && <DownloadOverlayButton url={url} filename={downloadName} label="Baixar imagem" />}
      </div>
      {caption && (
        <p className="mt-1.5 whitespace-pre-wrap break-words text-[15px] leading-[1.45]">{caption}</p>
      )}
      {zoomOpen && url && (
        <ImageLightbox
          url={url}
          alt={caption || 'Imagem'}
          downloadName={downloadName}
          onClose={() => setZoomOpen(false)}
        />
      )}
    </div>
  );
}

export function MediaVideo({ message, isOutbound }: MediaProps) {
  const { url, mimeType, loading, error, retry } = useResolvedMedia(message, { mode: 'eager' });
  const caption = message.content?.caption as string | undefined;

  return (
    <div>
      <div
        className={`relative overflow-hidden rounded-xl ${
          isOutbound ? 'bg-bubble-foreground/10' : 'bg-muted'
        }`}
      >
        {url ? (
          <video
            src={url}
            controls
            preload="metadata"
            className="max-h-72 w-full rounded-xl"
            onError={() => void retry()}
          >
            {mimeType && <source src={url} type={mimeType} />}
          </video>
        ) : (
          <MediaSkeleton
            label={loading ? 'Carregando vídeo…' : error || 'Vídeo'}
            error={!!error}
            isOutbound={isOutbound}
            onRetry={() => void retry()}
          />
        )}
        {url && (
          <DownloadOverlayButton
            url={url}
            filename={downloadNameFor(message, 'VIDEO', mimeType)}
            label="Baixar vídeo"
          />
        )}
      </div>
      {caption && (
        <p className="mt-1.5 whitespace-pre-wrap break-words text-[15px] leading-[1.45]">{caption}</p>
      )}
    </div>
  );
}

export function MediaDocument({ message, isOutbound }: MediaProps) {
  const { url, loading, error, retry } = useResolvedMedia(message);
  const filename = (message.content?.fileName as string | undefined) || 'Documento';
  const mimeType = (message.content?.mimeType as string | undefined) || '';
  const caption = message.content?.caption as string | undefined;
  const Icon = pickDocIcon(mimeType, filename);

  const onClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!url) {
      e.preventDefault();
      void retry();
    }
  };

  return (
    <div>
      <a
        href={url || '#'}
        onClick={onClick}
        target="_blank"
        rel="noopener noreferrer"
        download={filename}
        className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors ${
          isOutbound
            ? 'border-bubble-foreground/20 bg-bubble-foreground/10 hover:bg-bubble-foreground/15'
            : 'border-border bg-muted/60 hover:bg-muted'
        }`}
      >
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${
            isOutbound
              ? 'bg-bubble-foreground/15'
              : 'bg-primary/10 text-primary'
          }`}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{filename}</p>
          <p className={`truncate text-xs ${isOutbound ? 'text-bubble-foreground/75' : 'text-muted-foreground'}`}>
            {loading ? 'Preparando download…' : error ? 'Não baixou. Toque para tentar de novo' : documentTypeLabel(mimeType, filename)}
          </p>
        </div>
        {loading ? (
          <Loader2 className="h-[18px] w-[18px] shrink-0 animate-spin opacity-70" />
        ) : (
          <Download className="h-[18px] w-[18px] shrink-0 opacity-70" />
        )}
      </a>
      {caption && (
        <p className="mt-1.5 whitespace-pre-wrap break-words text-[15px] leading-[1.45]">{caption}</p>
      )}
    </div>
  );
}

export function MediaSticker({ message, isOutbound }: MediaProps) {
  const { url, loading, error, retry } = useResolvedMedia(message, { mode: 'eager' });

  if (url) {
    return (
      <img
        src={url}
        alt="Sticker"
        className="h-32 w-32 object-contain"
        onError={() => void retry()}
        loading="lazy"
      />
    );
  }
  return (
    <MediaSkeleton
      label={loading ? 'Carregando sticker…' : error || 'Sticker'}
      error={!!error}
      isOutbound={isOutbound}
      onRetry={() => void retry()}
      compact
    />
  );
}

export function MediaLocation({ message, isOutbound }: MediaProps) {
  const lat = message.content?.latitude as number | undefined;
  const lng = message.content?.longitude as number | undefined;
  const label = (message.content?.text as string | undefined) || 'Localização';
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return (
      <p className="flex items-center gap-1.5 text-[15px] leading-[1.45] opacity-90">
        <MapPin aria-hidden="true" className="h-4 w-4 shrink-0" />
        {label}
      </p>
    );
  }
  const url = `https://www.google.com/maps?q=${lat},${lng}`;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm transition-colors ${
        isOutbound
          ? 'border-bubble-foreground/20 bg-bubble-foreground/10 hover:bg-bubble-foreground/15'
          : 'border-border bg-muted/60 hover:bg-muted'
      }`}
    >
      <MapPin className="h-5 w-5 shrink-0 opacity-70" />
      <div className="min-w-0">
        <p className="truncate font-semibold">{label}</p>
        <p className="truncate font-mono text-xs tabular-nums opacity-75">
          {lat.toFixed(5)}, {lng.toFixed(5)}
        </p>
      </div>
    </a>
  );
}

function MediaSkeleton({
  label,
  error,
  isOutbound,
  onRetry,
  compact,
}: {
  label: string;
  error: boolean;
  isOutbound: boolean;
  onRetry: () => void;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onRetry}
      className={`flex w-full items-center gap-2 ${compact ? 'px-2 py-1.5' : 'px-3 py-6'} text-[13px] ${
        isOutbound ? 'text-bubble-foreground/75' : 'text-muted-foreground'
      }`}
    >
      {error ? (
        <AlertCircle className="h-4 w-4 shrink-0" />
      ) : (
        <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
      )}
      <span className="truncate">{label}</span>
    </button>
  );
}

function downloadNameFor(message: Message, kind: DownloadKind, resolvedMime?: string): string {
  return mediaDownloadName({
    fileName: message.content?.fileName as string | undefined,
    mimeType: resolvedMime ?? (message.content?.mimeType as string | undefined),
    createdAt: message.createdAt,
    kind,
  });
}

/** Hook local: dispara o download e segura o spinner enquanto busca o arquivo. */
function useMediaDownload(url: string, filename: string) {
  const [busy, setBusy] = useState(false);
  const start = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (busy) return;
    setBusy(true);
    try {
      await downloadMedia(url, filename);
    } finally {
      setBusy(false);
    }
  };
  return { busy, start };
}

/**
 * Setinha de download no canto da imagem/vídeo. Aparece ao passar o mouse
 * na mensagem (mesmo `group` dos botões Responder/IA) e com foco de teclado;
 * no toque fica sempre visível porque não há hover.
 */
function DownloadOverlayButton({ url, filename, label }: { url: string; filename: string; label: string }) {
  const { busy, start } = useMediaDownload(url, filename);
  const Icon = busy ? Loader2 : Download;
  return (
    <button
      type="button"
      onClick={start}
      disabled={busy}
      className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-zinc-950/60 text-white opacity-0 shadow-soft transition-opacity hover:bg-zinc-950/80 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white group-hover:opacity-100 [@media(hover:none)]:opacity-100"
      aria-label={label}
      title={label}
    >
      <Icon aria-hidden="true" className={`h-4 w-4 ${busy ? 'animate-spin' : ''}`} />
    </button>
  );
}

function LightboxDownloadButton({ url, filename }: { url: string; filename: string }) {
  const { busy, start } = useMediaDownload(url, filename);
  const Icon = busy ? Loader2 : Download;
  return (
    <button
      type="button"
      onClick={start}
      disabled={busy}
      className="absolute right-16 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
      aria-label="Baixar imagem"
      title="Baixar imagem"
    >
      <Icon aria-hidden="true" className={`h-5 w-5 ${busy ? 'animate-spin' : ''}`} />
    </button>
  );
}

function ImageLightbox({
  url,
  alt,
  downloadName,
  onClose,
}: {
  url: string;
  alt: string;
  downloadName: string;
  onClose: () => void;
}) {
  // Close on ESC; lock body scroll while open.
  // O véu escuro e o botão branco ficam: aqui o fundo é a foto, não o balão.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-zinc-950/85 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        aria-label="Fechar imagem"
        title="Fechar (Esc)"
      >
        <X className="h-5 w-5" />
      </button>
      <LightboxDownloadButton url={url} filename={downloadName} />
      <img
        src={url}
        alt={alt}
        className="max-h-full max-w-full rounded-lg object-contain shadow-overlay"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}

function pickDocIcon(mime: string, filename: string) {
  const m = (mime || '').toLowerCase();
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  if (m.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic'].includes(ext)) {
    return FileImage;
  }
  if (m.startsWith('video/') || ['mp4', 'mov', '3gp', 'webm'].includes(ext)) {
    return FileVideo;
  }
  if (m.startsWith('audio/') || ['mp3', 'm4a', 'wav', 'ogg'].includes(ext)) {
    return FileAudio;
  }
  if (m === 'application/pdf' || ext === 'pdf') return FileText;
  if (m === 'application/zip' || ['zip', 'rar', '7z'].includes(ext)) return FileArchive;
  if (
    ['xlsx', 'xls', 'csv'].includes(ext) ||
    m === 'text/csv' ||
    m.includes('spreadsheet') ||
    m.includes('excel')
  ) {
    return FileSpreadsheet;
  }
  if (m.startsWith('text/') || ['txt', 'md', 'doc', 'docx'].includes(ext)) {
    return FileText;
  }
  return FileIcon;
}
