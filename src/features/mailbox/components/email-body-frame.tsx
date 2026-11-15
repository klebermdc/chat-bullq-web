'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ImageOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sanitizeEmailHtml } from '../lib/sanitize-email';

const MIN_HEIGHT_PX = 160;
const MAX_HEIGHT_PX = 4000;

/**
 * Sandbox SEM `allow-scripts`: nada do e-mail roda. `allow-same-origin` só
 * serve para medir a altura do conteúdo daqui de fora (sem scripts lá dentro
 * não há como ele alcançar o app). Links abrem em aba nova, sem opener.
 */
const SANDBOX = 'allow-same-origin allow-popups allow-popups-to-escape-sandbox';

interface EmailBodyFrameProps {
  html: string | null;
  text: string | null;
  title: string;
}

/** Corpo do e-mail: HTML sanitizado num iframe isolado; sem HTML, o texto puro. */
export function EmailBodyFrame({ html, text, title }: EmailBodyFrameProps) {
  const [isRemoteImagesAllowed, setRemoteImagesAllowed] = useState(false);
  const sanitized = useMemo(
    () => (html ? sanitizeEmailHtml(html, isRemoteImagesAllowed) : null),
    [html, isRemoteImagesAllowed],
  );

  if (sanitized?.html) {
    return (
      <div className="space-y-2">
        {sanitized.hasRemoteImages && !isRemoteImagesAllowed && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <ImageOff aria-hidden="true" className="h-3.5 w-3.5" />
              Imagens da internet bloqueadas para proteger a conta.
            </span>
            <Button variant="outline" size="sm" onClick={() => setRemoteImagesAllowed(true)}>
              Mostrar imagens
            </Button>
          </div>
        )}
        <AutoHeightFrame srcDoc={sanitized.html} title={title} />
      </div>
    );
  }

  if (text?.trim()) {
    return (
      <pre className="whitespace-pre-wrap break-words rounded-lg border border-border bg-card p-4 font-sans text-sm leading-relaxed text-foreground">
        {text}
      </pre>
    );
  }

  return <p className="py-6 text-center text-sm text-muted-foreground">Este e-mail não tem texto.</p>;
}

function AutoHeightFrame({ srcDoc, title }: { srcDoc: string; title: string }) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(MIN_HEIGHT_PX);
  const observerRef = useRef<ResizeObserver | null>(null);

  useEffect(() => () => observerRef.current?.disconnect(), []);

  const handleLoad = () => {
    const doc = frameRef.current?.contentDocument;
    if (!doc?.documentElement) return;
    const measure = () =>
      setHeight(Math.min(MAX_HEIGHT_PX, Math.max(MIN_HEIGHT_PX, doc.documentElement.scrollHeight)));
    measure();
    observerRef.current?.disconnect();
    // Imagens liberadas depois mudam a altura: acompanha o corpo.
    if (typeof ResizeObserver !== 'undefined' && doc.body) {
      observerRef.current = new ResizeObserver(measure);
      observerRef.current.observe(doc.body);
    }
  };

  return (
    <iframe
      ref={frameRef}
      title={title}
      srcDoc={srcDoc}
      sandbox={SANDBOX}
      referrerPolicy="no-referrer"
      onLoad={handleLoad}
      style={{ height }}
      className="block w-full rounded-lg border border-border bg-white"
    />
  );
}
