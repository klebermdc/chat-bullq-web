'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Send, ChevronLeft, LayoutTemplate } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { controlCls } from '@/components/ui/control';
import { EmptyState, LoadingState } from '@/components/ui/empty-state';
import { templatesService, type Template } from '../services/templates.service';
import { findReengagementTemplate } from '../lib/reengagement';

interface TemplatePickerDialogProps {
  open: boolean;
  channelId: string;
  onClose: () => void;
  onSend: (content: Record<string, any>) => void | Promise<void>;
  /** Contato da conversa — usado para pré-preencher a variável {{1}}. */
  contact?: { name?: string | null };
  /** Abre direto no template de retomada do canal (ícone "Retomar contato"). */
  reengagement?: boolean;
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

const inputCls = `${controlCls} w-full`;

/** Categoria do template como a Meta devolve → rótulo em português. */
const CATEGORY_LABEL: Record<string, string> = {
  MARKETING: 'Marketing',
  UTILITY: 'Utilidade',
  AUTHENTICATION: 'Autenticação',
};

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
  reengagement = false,
}: TemplatePickerDialogProps) {
  const [selected, setSelected] = useState<Template | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [mediaUrl, setMediaUrl] = useState('');
  const [sending, setSending] = useState(false);
  // Pré-seleção do template de retomada acontece uma vez por abertura: se o
  // atendente voltar para a lista, não reabrimos o mesmo template à força.
  const [autoPickDone, setAutoPickDone] = useState(false);

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
      setAutoPickDone(false);
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

  const reengagementTemplate = useMemo(() => findReengagementTemplate(data), [data]);

  useEffect(() => {
    if (!open || !reengagement || autoPickDone || !data) return;
    if (reengagementTemplate) pickTemplate(reengagementTemplate);
    setAutoPickDone(true);
    // pickTemplate só lê `contact`, que não muda com o modal aberto.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, reengagement, autoPickDone, data, reengagementTemplate]);

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

  const hasApproved = !isLoading && approved.length > 0;
  const showDetail = hasApproved && !!selected;
  const titleText = selected
    ? selected.displayName || selected.name
    : reengagement
      ? 'Retomar contato'
      : 'Enviar template';

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="lg"
      // Com um template aberto há variáveis digitadas: Esc/clique fora não fecham.
      dismissible={!selected}
      title={
        <span className="flex min-w-0 items-center gap-1">
          {selected && (
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="-ml-1.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Voltar para a lista"
              title="Voltar para a lista"
            >
              <ChevronLeft aria-hidden="true" className="h-4 w-4" />
            </button>
          )}
          <span className="truncate">{titleText}</span>
        </span>
      }
      footer={
        showDetail ? (
          <>
            <Button type="button" variant="outline" onClick={() => setSelected(null)}>
              Voltar
            </Button>
            <Button
              type="button"
              onClick={handleSend}
              disabled={!!mediaFormat && !mediaUrl.trim()}
              loading={sending}
              title={mediaFormat && !mediaUrl.trim() ? 'Informe a URL da mídia' : undefined}
            >
              {!sending && <Send aria-hidden="true" className="h-4 w-4" />}
              Enviar
            </Button>
          </>
        ) : undefined
      }
    >
      {isLoading ? (
        <LoadingState label="Carregando templates…" />
      ) : approved.length === 0 ? (
        <EmptyState
          icon={LayoutTemplate}
          size="sm"
          title="Nenhum template aprovado neste canal"
          description="Crie um template e aguarde a aprovação da Meta para usá-lo aqui."
          action={
            <Link
              href="/settings/templates"
              className="text-sm font-medium text-primary hover:underline"
            >
              Gerenciar templates
            </Link>
          }
        />
      ) : !selected ? (
        // LISTA
        <div className="space-y-1.5">
          {reengagement && !reengagementTemplate && (
            <div className="mb-3 rounded-lg bg-warning-wash p-3 text-xs text-warning-ink">
              Este canal ainda não tem template de retomada. Escolha um abaixo
              ou defina o padrão em{' '}
              <Link href="/settings/templates" className="font-medium underline">
                Configurações › Templates
              </Link>
              .
            </div>
          )}
          {approved.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => pickTemplate(t)}
              className="flex w-full flex-col items-start rounded-lg border border-border p-3 text-left transition-colors hover:border-primary hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="text-sm font-medium text-foreground">
                {t.displayName || t.name}
              </span>
              <span className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                {t.components.body.text}
              </span>
              <span className="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                {CATEGORY_LABEL[t.category] ?? t.category} · {t.language}
              </span>
            </button>
          ))}
        </div>
      ) : (
        // DETALHE / VARIÁVEIS
        <div className="space-y-4">
          <div className="rounded-lg bg-muted p-3 text-sm text-foreground">
            <p className="whitespace-pre-wrap break-words">
              {selected.components.body.text}
            </p>
          </div>

          {mediaFormat && (
            <div className="space-y-1.5">
              <label htmlFor="tpl-media-url" className="block text-sm font-medium text-foreground">
                URL pública {mediaFormat === 'IMAGE' ? 'da' : 'do'}{' '}
                {MEDIA_LABEL[mediaFormat]}
              </label>
              <input
                id="tpl-media-url"
                className={inputCls}
                type="url"
                placeholder="https://..."
                value={mediaUrl}
                onChange={(e) => setMediaUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                A Meta precisa de uma URL acessível publicamente.
              </p>
            </div>
          )}

          {vars.length > 0 ? (
            <div className="space-y-3">
              {vars.map((n) => (
                <div key={n} className="space-y-1.5">
                  <label htmlFor={`tpl-var-${n}`} className="block text-sm font-medium text-foreground">
                    Variável <span className="font-mono">{`{{${n}}}`}</span>
                  </label>
                  <input
                    id={`tpl-var-${n}`}
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
            <p className="text-xs text-muted-foreground">
              Este template não tem variáveis.
            </p>
          )}
        </div>
      )}
    </Dialog>
  );
}
