'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2, X, Send, ChevronLeft } from 'lucide-react';
import { templatesService, type Template } from '../services/templates.service';

interface TemplatePickerDialogProps {
  open: boolean;
  channelId: string;
  onClose: () => void;
  onSend: (content: Record<string, any>) => void | Promise<void>;
  /** Contato da conversa — usado para pré-preencher a variável {{1}}. */
  contact?: { name?: string | null };
}

/** Formato do cabeçalho de mídia do template, ou null se não houver. */
type MediaFormat = 'IMAGE' | 'VIDEO' | 'DOCUMENT';

function mediaHeaderFormat(t: Template): MediaFormat | null {
  const fmt = t.components.header?.format;
  return fmt === 'IMAGE' || fmt === 'VIDEO' || fmt === 'DOCUMENT' ? fmt : null;
}

const MEDIA_LABEL: Record<MediaFormat, string> = {
  IMAGE: 'imagem',
  VIDEO: 'vídeo',
  DOCUMENT: 'documento',
};

const inputCls =
  'flex h-10 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm ring-offset-background placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100';

/** Variáveis {{n}} do corpo, distintas e em ordem crescente. */
function extractVariables(bodyText: string): string[] {
  const seen = new Set<string>();
  const re = /\{\{(\d+)\}\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(bodyText)) !== null) seen.add(m[1]);
  return [...seen].sort((a, b) => Number(a) - Number(b));
}

/** Monta o array `components` do payload (header de mídia + body). */
function buildParams(
  vars: string[],
  values: Record<string, string>,
  mediaFormat: MediaFormat | null,
  mediaUrl: string,
): Record<string, any>[] {
  const components: Record<string, any>[] = [];

  const link = mediaUrl.trim();
  if (mediaFormat && link) {
    if (mediaFormat === 'IMAGE') {
      components.push({
        type: 'header',
        parameters: [{ type: 'image', image: { link } }],
      });
    } else if (mediaFormat === 'VIDEO') {
      components.push({
        type: 'header',
        parameters: [{ type: 'video', video: { link } }],
      });
    } else {
      components.push({
        type: 'header',
        parameters: [{ type: 'document', document: { link } }],
      });
    }
  }

  if (vars.length > 0) {
    components.push({
      type: 'body',
      parameters: vars.map((n) => ({ type: 'text', text: values[n] })),
    });
  }

  return components;
}

export function TemplatePickerDialog({
  open,
  channelId,
  onClose,
  onSend,
  contact,
}: TemplatePickerDialogProps) {
  const [selected, setSelected] = useState<Template | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [mediaUrl, setMediaUrl] = useState('');
  const [sending, setSending] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['templates', channelId],
    queryFn: () => templatesService.list(channelId),
    enabled: open && !!channelId,
  });

  const approved = useMemo(
    () => (data ?? []).filter((t) => t.status === 'APPROVED'),
    [data],
  );

  // Reseta seleção/valores ao abrir/fechar.
  useEffect(() => {
    if (!open) {
      setSelected(null);
      setValues({});
      setMediaUrl('');
      setSending(false);
    }
  }, [open]);

  const vars = useMemo(
    () => (selected ? extractVariables(selected.components.body.text) : []),
    [selected],
  );

  const mediaFormat = useMemo(
    () => (selected ? mediaHeaderFormat(selected) : null),
    [selected],
  );

  const pickTemplate = (t: Template) => {
    setSelected(t);
    setMediaUrl('');
    // Pré-preenche {{1}} com o primeiro nome do contato, se existir na body.
    const firstName = contact?.name?.trim().split(/\s+/)[0];
    const templateVars = extractVariables(t.components.body.text);
    if (firstName && templateVars.includes('1')) {
      setValues({ '1': firstName });
    } else {
      setValues({});
    }
  };

  const handleSend = async () => {
    if (!selected) return;
    if (mediaFormat && !mediaUrl.trim()) {
      toast.error('Informe a URL da mídia');
      return;
    }
    for (const n of vars) {
      if (!values[n]?.trim()) {
        toast.error('Preencha todas as variáveis do template');
        return;
      }
    }
    const content: Record<string, any> = {
      name: selected.name,
      language: { code: selected.language },
      components: buildParams(vars, values, mediaFormat, mediaUrl),
    };
    setSending(true);
    try {
      await onSend(content);
      onClose();
    } catch {
      // onSend já reporta o erro; mantém o modal aberto pra tentar de novo.
      setSending(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-50 w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-zinc-900">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {selected && (
              <button
                onClick={() => setSelected(null)}
                className="rounded-md p-1 text-zinc-400 hover:text-zinc-600"
                aria-label="Voltar para a lista"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            )}
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              {selected ? selected.displayName || selected.name : 'Enviar template'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-zinc-400 hover:text-zinc-600"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5">
          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
            </div>
          ) : approved.length === 0 ? (
            <div className="rounded-md border border-dashed border-zinc-300 p-6 text-center dark:border-zinc-700">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Nenhum template aprovado neste canal.
              </p>
              <Link
                href="/settings/templates"
                className="mt-2 inline-block text-sm font-medium text-primary hover:underline"
              >
                Gerenciar templates
              </Link>
            </div>
          ) : !selected ? (
            // LISTA
            <div className="space-y-1.5">
              {approved.map((t) => (
                <button
                  key={t.id}
                  onClick={() => pickTemplate(t)}
                  className="flex w-full flex-col items-start rounded-lg border border-zinc-200 p-3 text-left transition-colors hover:border-primary hover:bg-primary/5 dark:border-zinc-700"
                >
                  <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {t.displayName || t.name}
                  </span>
                  <span className="mt-0.5 line-clamp-2 text-xs text-zinc-500 dark:text-zinc-400">
                    {t.components.body.text}
                  </span>
                  <span className="mt-1 text-[10px] uppercase tracking-wide text-zinc-400">
                    {t.category} · {t.language}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            // DETALHE / VARIÁVEIS
            <div className="space-y-4">
              <div className="rounded-lg bg-zinc-50 p-3 text-sm text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                <p className="whitespace-pre-wrap break-words">
                  {selected.components.body.text}
                </p>
              </div>

              {mediaFormat && (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    URL pública {mediaFormat === 'IMAGE' ? 'da' : mediaFormat === 'VIDEO' ? 'do' : 'do'}{' '}
                    {MEDIA_LABEL[mediaFormat]}
                  </label>
                  <input
                    className={inputCls}
                    type="url"
                    placeholder="https://..."
                    value={mediaUrl}
                    onChange={(e) => setMediaUrl(e.target.value)}
                  />
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    A Meta precisa de uma URL acessível publicamente.
                  </p>
                </div>
              )}

              {vars.length > 0 ? (
                <div className="space-y-3">
                  {vars.map((n) => (
                    <div key={n} className="space-y-1.5">
                      <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        Variável {`{{${n}}}`}
                      </label>
                      <input
                        className={inputCls}
                        placeholder={selected.variableExamples?.[n] || `Valor {{${n}}}`}
                        value={values[n] ?? ''}
                        onChange={(e) =>
                          setValues((prev) => ({ ...prev, [n]: e.target.value }))
                        }
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Este template não tem variáveis.
                </p>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <button
                  onClick={() => setSelected(null)}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  Voltar
                </button>
                <button
                  onClick={handleSend}
                  disabled={sending || (!!mediaFormat && !mediaUrl.trim())}
                  title={
                    mediaFormat && !mediaUrl.trim()
                      ? 'Informe a URL da mídia'
                      : undefined
                  }
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
                >
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Enviar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
