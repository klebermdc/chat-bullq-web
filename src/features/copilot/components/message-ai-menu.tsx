'use client';

import { useEffect, useRef } from 'react';
import { Copy, Reply, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

interface MessageAiMenuProps {
  position: { x: number; y: number };
  text: string;
  onAsk: () => void;
  onReply: () => void;
  onClose: () => void;
}

const MENU_WIDTH = 220;
const MENU_HEIGHT = 140;
const EDGE = 8;

const itemCls =
  'flex min-h-9 w-full items-center gap-2 rounded-lg px-3 text-left text-sm text-foreground transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none';

/** Clique direito na mensagem do cliente: perguntar à IA, responder ou copiar. */
export function MessageAiMenu({ position, text, onAsk, onReply, onClose }: MessageAiMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ref.current?.querySelector<HTMLButtonElement>('button')?.focus();
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onClose, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onClose, true);
    };
  }, [onClose]);

  // Não deixa o menu sair da tela perto das bordas.
  const left = Math.max(EDGE, Math.min(position.x, window.innerWidth - MENU_WIDTH - EDGE));
  const top = Math.max(EDGE, Math.min(position.y, window.innerHeight - MENU_HEIGHT - EDGE));

  const run = (fn: () => void) => () => {
    fn();
    onClose();
  };
  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copiado');
    } catch {
      toast.error('Não consegui copiar.');
    }
  };

  return (
    <div
      ref={ref}
      role="menu"
      aria-label="Ações da mensagem"
      style={{ left, top, width: MENU_WIDTH }}
      className="fixed z-50 rounded-xl border border-border bg-popover p-1 shadow-xl"
    >
      <button type="button" role="menuitem" onClick={run(onAsk)} className={`${itemCls} font-medium text-primary`}>
        <Sparkles aria-hidden="true" className="size-4" /> Perguntar à IA
      </button>
      <button type="button" role="menuitem" onClick={run(onReply)} className={itemCls}>
        <Reply aria-hidden="true" className="size-4" /> Responder
      </button>
      {text && (
        <button type="button" role="menuitem" onClick={run(() => void copyText())} className={itemCls}>
          <Copy aria-hidden="true" className="size-4" /> Copiar texto
        </button>
      )}
    </div>
  );
}
