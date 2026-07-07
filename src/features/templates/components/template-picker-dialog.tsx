'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2, X, Send, ChevronLeft, AlertTriangle } from 'lucide-react';
import { templatesService, type Template } from '../services/templates.service';

interface TemplatePickerDialogProps {
  open: boolean;
  channelId: string;
  onClose: () => void;
  onSend: (content: Record<string, any>) => void | Promise<void>;
}

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

/** Cabeçalho de mídia (IMAGE/VIDEO/DOCUMENT) precisa de parâmetro de header no
 *  envio — fora do escopo. Templates assim ficam com o Enviar desabilitado. */
function hasMediaHeader(t: Template): boolean {
  const fmt = t.components.header?.format;
  return fmt === 'IMAGE' || fmt === 'VIDEO' || fmt === 'DOCUMENT';
}

/** Monta o array `components` do payload (só body por enquanto). */
function buildParams(
  vars: string[],
  values: Record<string, string>,
): Record<string, any>[] {
  if (vars.length === 0) return [];
  return [
    {
      type: 'body',
      parameters: vars.map((n) => ({ type: 'text', text: values[n] })),
    },
  ];
}

export function TemplatePickerDialog({
  open,
  channelId,
  onClose,
  onSend,
}: TemplatePickerDialogProps) {
  const [selected, setSelected] = useState<Template | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
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
      setSending(false);
    }
  }, [open]);

  const vars = useMemo(
    () => (selected ? extractVariables(selected.components.body.text) : []),
    [selected],
  );

  const pickTemplate = (t: Template) => {
    setSelected(t);
    setValues({});
  };

  const handleSend = async () => {
    if (!selected) return;
    if (hasMediaHeader(selected)) return;
    for (const n of vars) {
      if (!values[n]?.trim()) {
        toast.error('Preencha todas as variáveis do template');
        return;
      }
    }
    const content: Record<string, any> = {
      name: selected.name,
      language: { code: selected.language },
      components: buildParams(vars, values),
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

              {hasMediaHeader(selected) ? (
                <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-200">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    Envio de template com mídia ({selected.components.header?.format})
                    ainda não é suportado por aqui.
                  </span>
                </div>
              ) : vars.length > 0 ? (
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
                  disabled={sending || hasMediaHeader(selected)}
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
