'use client';

import { useState, type ReactNode } from 'react';
import { Bot, FileText, Lock, Paperclip } from 'lucide-react';
import type { UmblerMessage } from '../services/inbox.service';
import { safeMediaUrl, umblerMediaKind, umblerSide } from '../lib/umbler-history';

/** Renderizador de texto do chat (links, prévia) — vem do ChatPanel. */
export type RenderMessageText = (text: string, isOutbound: boolean) => ReactNode;

// Mesmas formas dos balões do ChatPanel: 18px com a "cauda" de 6px.
const BUBBLE_SENT_CLS = 'rounded-[18px] rounded-br-[6px] bg-bubble text-bubble-foreground';
const BUBBLE_RECEIVED_CLS =
  'rounded-[18px] rounded-bl-[6px] bg-bubble-in text-bubble-in-foreground shadow-soft';
const NOTE_CLS =
  'rounded-[18px] rounded-br-[6px] border border-dashed border-foreground/20 bg-card/60 text-muted-foreground';

function formatTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

/** Tom de apoio dentro do balão: derivado do texto do balão, nunca fixo. */
function mutedInk(isOutbound: boolean): string {
  return isOutbound ? 'text-bubble-foreground/70' : 'text-bubble-in-foreground/70';
}

function attachmentCls(isOutbound: boolean): string {
  return isOutbound
    ? 'border-bubble-foreground/20 bg-bubble-foreground/10 hover:bg-bubble-foreground/15'
    : 'border-bubble-in-foreground/15 bg-bubble-in-foreground/5 hover:bg-bubble-in-foreground/10';
}

type FileProps = { file: NonNullable<UmblerMessage['file']>; isOutbound: boolean };

/** Anexo: link com o nome. Links da Umbler podem expirar — o nome fica. */
function UmblerFileLink({ file, url, isOutbound }: FileProps & { url: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-[13px] transition-colors ${attachmentCls(isOutbound)}`}
    >
      <Paperclip className="h-4 w-4 shrink-0 opacity-70" aria-hidden="true" />
      <span className="truncate font-medium">{file.name || 'Arquivo'}</span>
    </a>
  );
}

/** Arquivo que não carregou (link vencido): só o nome, sem prometer download. */
function UnavailableFile({ file, isOutbound }: FileProps) {
  return (
    <p className={`flex items-center gap-2 text-[13px] ${mutedInk(isOutbound)}`}>
      <FileText className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="truncate">{file.name || 'Arquivo'} · indisponível</span>
    </p>
  );
}

function UmblerMedia({ message, isOutbound }: { message: UmblerMessage; isOutbound: boolean }) {
  const [failed, setFailed] = useState(false);
  const kind = umblerMediaKind(message);
  const file = message.file;
  const url = safeMediaUrl(file?.url);
  if (!file) return null;
  // Link inseguro, inválido ou vencido: fica só o nome.
  if (!url || kind === 'none' || failed) {
    return <UnavailableFile file={file} isOutbound={isOutbound} />;
  }

  if (kind === 'image') {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="block">
        <img
          src={url}
          alt={file.name || 'Imagem'}
          loading="lazy"
          className="max-h-64 rounded-xl bg-muted object-cover"
          onError={() => setFailed(true)}
        />
      </a>
    );
  }
  if (kind === 'audio') {
    return (
      <audio
        controls
        preload="none"
        src={url}
        aria-label={file.name || 'Áudio'}
        className="w-64 max-w-full"
        onError={() => setFailed(true)}
      />
    );
  }
  if (kind === 'video') {
    return (
      <video
        controls
        preload="metadata"
        src={url}
        aria-label={file.name || 'Vídeo'}
        className="max-h-72 max-w-full rounded-xl"
        onError={() => setFailed(true)}
      />
    );
  }
  return <UmblerFileLink file={file} url={url} isOutbound={isOutbound} />;
}

function NoteBubble({ message, renderText }: { message: UmblerMessage; renderText: RenderMessageText }) {
  return (
    <div className="flex justify-end">
      <div className={`max-w-[min(74%,560px)] px-4 py-2.5 ${NOTE_CLS}`}>
        <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold">
          <Lock className="h-3.5 w-3.5" aria-hidden="true" />
          Nota interna{message.author ? ` · ${message.author}` : ''}
        </p>
        {message.text && renderText(message.text, false)}
        <UmblerMedia message={message} isOutbound={false} />
        <p className="mt-1 text-right font-mono text-xs tabular-nums">{formatTime(message.sentAt)}</p>
      </div>
    </div>
  );
}

/**
 * Uma mensagem do arquivo da Umbler. Só leitura: sem responder, reagir,
 * encaminhar ou citar — a conversa de origem nem existe mais no provedor.
 */
export function UmblerMessageBubble({
  message,
  renderText,
}: {
  message: UmblerMessage;
  renderText: RenderMessageText;
}) {
  if (message.isPrivate) return <NoteBubble message={message} renderText={renderText} />;

  const isOutbound = umblerSide(message.origin) === 'sent';
  // Com arquivo sempre desenha algo: a mídia, o link ou ao menos o nome.
  const hasMedia = message.file !== null;
  const isBot = message.origin.toLowerCase() === 'bot';

  return (
    <div className={`flex min-w-0 ${isOutbound ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`min-w-0 max-w-[min(74%,560px)] px-4 py-2.5 ${
          isOutbound ? BUBBLE_SENT_CLS : BUBBLE_RECEIVED_CLS
        }`}
      >
        {isOutbound && message.author && (
          <p className={`mb-1 flex items-center gap-1 text-xs font-semibold ${mutedInk(isOutbound)}`}>
            {isBot && <Bot className="h-3.5 w-3.5" aria-hidden="true" />}
            {message.author}
          </p>
        )}
        {!isOutbound && <span className="sr-only">Cliente: </span>}
        {hasMedia && <UmblerMedia message={message} isOutbound={isOutbound} />}
        {message.text ? (
          <div className={hasMedia ? 'mt-1.5' : ''}>{renderText(message.text, isOutbound)}</div>
        ) : (
          !hasMedia && <p className="text-[15px] italic leading-[1.45]">[{message.type}]</p>
        )}
        <p
          className={`mt-1 font-mono text-xs font-medium tabular-nums ${mutedInk(isOutbound)} ${
            isOutbound ? 'text-right' : ''
          }`}
        >
          {formatTime(message.sentAt)}
        </p>
      </div>
    </div>
  );
}
