'use client';

import { useEffect, useRef, useState } from 'react';
import { Copy, CornerDownLeft, ImagePlus, Send, X } from 'lucide-react';
import { toast } from 'sonner';
import { controlCls } from '@/components/ui/control';
import { CONSULT_IMAGE_MAX_BYTES, CONSULT_IMAGE_TYPES, type ConsultContext } from '../api';
import { useConsultChat } from '../hooks/use-consult-chat';

interface ConsultChatProps {
  context?: ConsultContext;
  /** Perguntas prontas mostradas antes da primeira pergunta. */
  starters: string[];
  /** Pergunta enviada sozinha ao abrir (ex.: clique direito numa mensagem). */
  autoAsk?: string;
  intro: React.ReactNode;
  /** Presente só dentro da conversa: coloca a sugestão no compositor, sem enviar. */
  onUseSuggestion?: (text: string) => void;
}

async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success('Copiado');
  } catch {
    toast.error('Não consegui copiar. Selecione o texto e copie à mão.');
  }
}

function Suggestion({ text, onUse }: { text: string; onUse?: (text: string) => void }) {
  return (
    <div className="mt-2 rounded-xl border border-primary/25 bg-primary/5 p-3">
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-primary">
        Sugestão para o cliente
      </p>
      <p className="whitespace-pre-wrap text-sm text-foreground">{text}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {onUse && (
          <button
            type="button"
            onClick={() => onUse(text)}
            className="inline-flex min-h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <CornerDownLeft aria-hidden="true" className="size-3.5" /> Usar no compositor
          </button>
        )}
        <button
          type="button"
          onClick={() => copy(text)}
          className="inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-medium text-foreground transition-colors hover:bg-muted"
        >
          <Copy aria-hidden="true" className="size-3.5" /> Copiar
        </button>
      </div>
    </div>
  );
}

/** Confere tipo e tamanho; avisa e devolve null quando o arquivo não serve. */
function acceptImage(file: File | undefined | null): File | null {
  if (!file) return null;
  if (!CONSULT_IMAGE_TYPES.includes(file.type)) {
    toast.error('Use uma imagem JPG, PNG ou WEBP.');
    return null;
  }
  if (file.size > CONSULT_IMAGE_MAX_BYTES) {
    toast.error('Imagem grande demais (máx. 5 MB).');
    return null;
  }
  return file;
}

/** Conversa com o Copiloto no modo Consulta (página e painel da conversa). */
export function ConsultChat({ context, starters, autoAsk, intro, onUseSuggestion }: ConsultChatProps) {
  const { turns, loading, error, send } = useConsultChat(context);
  const [input, setInput] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const asked = useRef(false);

  useEffect(() => {
    if (!autoAsk || asked.current) return;
    asked.current = true;
    void send(autoAsk);
  }, [autoAsk, send]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [turns.length, loading]);

  useEffect(() => {
    if (!image) {
      setImagePreview(null);
      return;
    }
    const url = URL.createObjectURL(image);
    setImagePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [image]);

  function submit(text: string) {
    if ((!text.trim() && !image) || loading) return;
    setInput('');
    const attached = image ?? undefined;
    setImage(null);
    if (fileRef.current) fileRef.current.value = '';
    void send(text, attached);
  }

  // Ctrl+V de um print direto no campo da pergunta.
  function onPaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const file = Array.from(e.clipboardData.files).find((f) => f.type.startsWith('image/'));
    if (!file) return;
    e.preventDefault();
    const ok = acceptImage(file);
    if (ok) setImage(ok);
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-3">
        {turns.length === 0 && !loading && (
          <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground shadow-soft">
            {intro}
          </div>
        )}
        {turns.map((t, i) => (
          <div key={i} className={t.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
            <div
              className={`max-w-[88%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm ${
                t.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'border border-border bg-card text-foreground'
              }`}
            >
              {t.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element -- object URL local, sem otimização do Next
                <img src={t.imageUrl} alt="Imagem enviada" className="mb-2 max-h-48 rounded-lg" />
              )}
              {t.content}
              {t.role === 'assistant' && t.suggestion && (
                <Suggestion text={t.suggestion} onUse={onUseSuggestion} />
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div role="status" className="rounded-2xl border border-border bg-card px-4 py-2.5 text-sm text-muted-foreground">
              Consultando…
            </div>
          </div>
        )}
        {error && (
          <div role="alert" className="rounded-lg bg-urgent-wash px-3 py-2 text-sm text-urgent-ink">
            {error}
          </div>
        )}
        <div ref={endRef} />
      </div>

      {turns.length === 0 && !loading && (
        <div className="flex flex-wrap gap-2 px-4 pb-2">
          {starters.map((s) => (
            <button
              key={s}
              onClick={() => submit(s)}
              type="button"
              className="min-h-9 rounded-full border border-border px-3 py-1.5 text-left text-xs text-primary transition-colors hover:bg-primary/10"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {imagePreview && (
        <div className="flex items-center gap-2 px-4 pt-1">
          {/* eslint-disable-next-line @next/next/no-img-element -- object URL local */}
          <img src={imagePreview} alt="Imagem anexada" className="h-14 rounded-lg border border-border" />
          <button
            type="button"
            onClick={() => setImage(null)}
            aria-label="Remover imagem"
            title="Remover imagem"
            className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(input);
        }}
        className="flex items-center gap-2 px-4 py-3"
      >
        <input
          ref={fileRef}
          type="file"
          accept={CONSULT_IMAGE_TYPES.join(',')}
          className="hidden"
          onChange={(e) => {
            const ok = acceptImage(e.target.files?.[0]);
            if (ok) setImage(ok);
            e.target.value = '';
          }}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={loading}
          aria-label="Anexar imagem"
          title="Anexar imagem (ou cole com Ctrl+V)"
          className="grid size-11 shrink-0 place-items-center rounded-xl border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
        >
          <ImagePlus className="size-4" />
        </button>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onPaste={onPaste}
          placeholder={image ? 'Pergunte sobre a imagem…' : 'Pergunte à IA…'}
          aria-label="Pergunta para a IA"
          maxLength={2000}
          className={`${controlCls} h-11 min-w-0 flex-1 rounded-xl px-4`}
        />
        <button
          type="submit"
          disabled={loading || (!input.trim() && !image)}
          aria-label="Enviar pergunta"
          title="Enviar pergunta"
          className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          <Send className="size-4" />
        </button>
      </form>
    </div>
  );
}
