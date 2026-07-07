'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2, Plus, Trash2, ArrowLeft, Variable } from 'lucide-react';
import {
  templatesService,
  type TemplateComponents,
  type CreateTemplatePayload,
} from '../services/templates.service';
import { TemplatePreview } from './template-preview';

const inputCls =
  'flex h-10 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm ring-offset-background placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100';
const labelCls = 'text-sm font-medium text-zinc-700 dark:text-zinc-300';
const errorCls = 'text-xs text-red-500';

export type ButtonForm = {
  type: 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER';
  text: string;
  url?: string;
  phone?: string;
};
export type HeaderForm = {
  format: 'NONE' | 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT';
  text?: string;
  exampleHandle?: string;
  previewUrl?: string;
};
export type Form = {
  name: string;
  displayName: string;
  category: 'MARKETING' | 'UTILITY';
  language: string;
  header: HeaderForm;
  bodyText: string;
  footerText: string;
  buttons: ButtonForm[];
  variableExamples: Record<string, string>;
};

const initialForm: Form = {
  name: '',
  displayName: '',
  category: 'UTILITY',
  language: 'pt_BR',
  header: { format: 'NONE' },
  bodyText: '',
  footerText: '',
  buttons: [],
  variableExamples: {},
};

// Índices de variáveis distintas presentes no corpo, em ordem crescente.
function extractVariables(text: string): number[] {
  const set = new Set<number>();
  for (const m of text.matchAll(/\{\{(\d+)\}\}/g)) {
    set.add(Number(m[1]));
  }
  return [...set].sort((a, b) => a - b);
}

function buildComponents(form: Form): TemplateComponents {
  const components: TemplateComponents = { body: { text: form.bodyText } };

  if (form.header.format !== 'NONE') {
    if (form.header.format === 'TEXT') {
      components.header = { format: 'TEXT', text: form.header.text ?? '' };
    } else {
      components.header = {
        format: form.header.format,
        exampleHandle: form.header.exampleHandle,
      };
    }
  }

  if (form.footerText.trim()) {
    components.footer = { text: form.footerText };
  }

  if (form.buttons.length > 0) {
    components.buttons = form.buttons.map((b) => ({
      type: b.type,
      text: b.text,
      ...(b.type === 'URL' ? { url: b.url } : {}),
      ...(b.type === 'PHONE_NUMBER' ? { phone: b.phone } : {}),
    }));
  }

  return components;
}

export function TemplateBuilder({ templateId }: { templateId?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const channelId = searchParams.get('channel');

  const isEdit = !!templateId && templateId !== 'new';

  const [form, setForm] = useState<Form>(initialForm);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [saving, setSaving] = useState(false);

  const { data: template } = useQuery({
    queryKey: ['template', templateId, channelId],
    queryFn: () => templatesService.getById(templateId!, channelId!),
    enabled: isEdit && !!channelId,
  });

  // Hidrata o form a partir do template carregado.
  useEffect(() => {
    if (!template) return;
    const c = template.components;
    setForm({
      name: template.name,
      displayName: template.displayName ?? '',
      category: template.category,
      language: template.language,
      header: c.header
        ? {
            format: c.header.format,
            text: c.header.text,
            exampleHandle: c.header.exampleHandle,
          }
        : { format: 'NONE' },
      bodyText: c.body?.text ?? '',
      footerText: c.footer?.text ?? '',
      buttons: (c.buttons ?? []).map((b) => ({
        type: b.type,
        text: b.text,
        url: b.url,
        phone: b.phone,
      })),
      variableExamples: template.variableExamples ?? {},
    });
  }, [template]);

  const patch = (p: Partial<Form>) => setForm((f) => ({ ...f, ...p }));
  const patchHeader = (p: Partial<HeaderForm>) =>
    setForm((f) => ({ ...f, header: { ...f.header, ...p } }));

  const variables = extractVariables(form.bodyText);

  const insertVariable = () => {
    const next = (variables.length ? Math.max(...variables) : 0) + 1;
    patch({ bodyText: form.bodyText + ' {{' + next + '}}' });
  };

  const handleMediaChange = async (file: File | undefined) => {
    if (!file || !channelId) return;
    setUploadingMedia(true);
    try {
      const handle = await templatesService.uploadMedia(channelId, file);
      patchHeader({ exampleHandle: handle, previewUrl: URL.createObjectURL(file) });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao enviar arquivo');
    } finally {
      setUploadingMedia(false);
    }
  };

  const setButton = (idx: number, p: Partial<ButtonForm>) =>
    setForm((f) => ({
      ...f,
      buttons: f.buttons.map((b, i) => (i === idx ? { ...b, ...p } : b)),
    }));

  const addButton = () =>
    setForm((f) =>
      f.buttons.length >= 3
        ? f
        : { ...f, buttons: [...f.buttons, { type: 'QUICK_REPLY', text: '' }] },
    );

  const removeButton = (idx: number) =>
    setForm((f) => ({ ...f, buttons: f.buttons.filter((_, i) => i !== idx) }));

  const handleSave = async (thenSubmit: boolean) => {
    if (!channelId) return;
    if (!/^[a-z0-9_]+$/.test(form.name)) {
      toast.error('Nome inválido: use apenas letras minúsculas, números e _');
      return;
    }
    if (!form.bodyText.trim()) {
      toast.error('O corpo do template é obrigatório');
      return;
    }
    if (
      (form.header.format === 'IMAGE' ||
        form.header.format === 'VIDEO' ||
        form.header.format === 'DOCUMENT') &&
      !form.header.exampleHandle
    ) {
      toast.error('Anexe um arquivo de exemplo para o cabeçalho de mídia.');
      return;
    }

    // Poda os exemplos pelas variáveis vigentes do corpo (I2).
    const vars = extractVariables(form.bodyText);
    const prunedExamples = Object.fromEntries(
      vars.map((n) => [String(n), (form.variableExamples[String(n)] ?? '').trim()]),
    );

    if (
      thenSubmit &&
      vars.some((n) => !prunedExamples[String(n)])
    ) {
      toast.error('Preencha o exemplo de todas as variáveis antes de submeter.');
      return;
    }

    setSaving(true);
    try {
      const payload: CreateTemplatePayload = {
        name: form.name,
        displayName: form.displayName || undefined,
        category: form.category,
        language: form.language,
        components: buildComponents(form),
        variableExamples: prunedExamples,
      };

      let id: string;
      if (isEdit) {
        await templatesService.update(templateId!, channelId, payload);
        id = templateId!;
      } else {
        const t = await templatesService.create(channelId, payload);
        id = t.id;
      }

      if (thenSubmit) {
        await templatesService.submit(id, channelId);
      }

      toast.success(
        thenSubmit ? 'Template salvo e enviado para aprovação' : 'Rascunho salvo',
      );
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      router.push('/settings/templates');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar template');
    } finally {
      setSaving(false);
    }
  };

  // Fluxo normal sempre traz ?channel=<id>; este é um fallback defensivo.
  if (!channelId) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Canal não informado. Volte à lista de templates e tente novamente.
        </p>
        <button
          onClick={() => router.push('/settings/templates')}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para templates
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          aria-label="Voltar"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          {isEdit ? 'Editar template' : 'Novo template'}
        </h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Coluna esquerda: formulário */}
        <div className="space-y-8">
          {/* a) Básico */}
          <section className="space-y-4">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Básico
            </h2>
            <div className="space-y-1.5">
              <label className={labelCls}>Nome</label>
              <input
                className={inputCls}
                placeholder="ex.: confirmacao_pedido"
                value={form.name}
                onChange={(e) =>
                  patch({ name: e.target.value.toLowerCase().replace(/\s+/g, '_') })
                }
              />
              <p className={errorCls}>
                Apenas letras minúsculas, números e underline.
              </p>
            </div>
            <div className="space-y-1.5">
              <label className={labelCls}>Nome de exibição (opcional)</label>
              <input
                className={inputCls}
                placeholder="Confirmação de pedido"
                value={form.displayName}
                onChange={(e) => patch({ displayName: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className={labelCls}>Categoria</label>
                <select
                  className={inputCls}
                  value={form.category}
                  onChange={(e) =>
                    patch({ category: e.target.value as Form['category'] })
                  }
                >
                  <option value="MARKETING">Marketing</option>
                  <option value="UTILITY">Utilidade</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className={labelCls}>Idioma</label>
                <select
                  className={inputCls}
                  value={form.language}
                  onChange={(e) => patch({ language: e.target.value })}
                >
                  <option value="pt_BR">Português (BR)</option>
                  <option value="en_US">Inglês (US)</option>
                  <option value="es_ES">Espanhol (ES)</option>
                </select>
              </div>
            </div>
          </section>

          {/* b) Cabeçalho */}
          <section className="space-y-4">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Cabeçalho
            </h2>
            <div className="space-y-1.5">
              <label className={labelCls}>Formato</label>
              <select
                className={inputCls}
                value={form.header.format}
                onChange={(e) =>
                  patchHeader({
                    format: e.target.value as HeaderForm['format'],
                    text: undefined,
                    exampleHandle: undefined,
                    previewUrl: undefined,
                  })
                }
              >
                <option value="NONE">Nenhum</option>
                <option value="TEXT">Texto</option>
                <option value="IMAGE">Imagem</option>
                <option value="VIDEO">Vídeo</option>
                <option value="DOCUMENT">Documento</option>
              </select>
            </div>

            {form.header.format === 'TEXT' && (
              <div className="space-y-1.5">
                <label className={labelCls}>Texto do cabeçalho</label>
                <input
                  className={inputCls}
                  value={form.header.text ?? ''}
                  onChange={(e) => patchHeader({ text: e.target.value })}
                />
              </div>
            )}

            {(form.header.format === 'IMAGE' ||
              form.header.format === 'VIDEO' ||
              form.header.format === 'DOCUMENT') && (
              <div className="space-y-2">
                <label className={labelCls}>Arquivo de exemplo</label>
                <input
                  type="file"
                  accept={
                    form.header.format === 'IMAGE'
                      ? 'image/*'
                      : form.header.format === 'VIDEO'
                        ? 'video/*'
                        : undefined
                  }
                  disabled={uploadingMedia}
                  onChange={(e) => handleMediaChange(e.target.files?.[0])}
                  className="block w-full text-sm text-zinc-600 file:mr-3 file:rounded-md file:border-0 file:bg-primary/10 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary hover:file:bg-primary/20 dark:text-zinc-400"
                />
                {uploadingMedia ? (
                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Enviando arquivo…
                  </div>
                ) : form.header.exampleHandle ? (
                  <div className="flex items-center gap-2 text-xs text-emerald-600">
                    {form.header.previewUrl && form.header.format === 'IMAGE' ? (
                      <img
                        src={form.header.previewUrl}
                        alt="Prévia"
                        className="h-10 w-10 rounded object-cover"
                      />
                    ) : null}
                    Arquivo enviado
                  </div>
                ) : null}
              </div>
            )}
          </section>

          {/* c) Corpo */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Corpo
              </h2>
              <button
                type="button"
                onClick={insertVariable}
                className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 px-2 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                <Variable className="h-3.5 w-3.5" />
                Inserir variável
              </button>
            </div>
            <textarea
              className={inputCls + ' h-32 py-2'}
              placeholder="Olá {{1}}, seu pedido foi confirmado."
              value={form.bodyText}
              onChange={(e) => patch({ bodyText: e.target.value })}
            />

            {variables.length > 0 && (
              <div className="space-y-2">
                {variables.map((n) => (
                  <div key={n} className="space-y-1.5">
                    <label className={labelCls}>{`Exemplo para {{${n}}}`}</label>
                    <input
                      className={inputCls}
                      value={form.variableExamples[String(n)] ?? ''}
                      onChange={(e) =>
                        patch({
                          variableExamples: {
                            ...form.variableExamples,
                            [String(n)]: e.target.value,
                          },
                        })
                      }
                    />
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* d) Rodapé */}
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Rodapé
            </h2>
            <div className="space-y-1.5">
              <label className={labelCls}>Texto do rodapé (opcional)</label>
              <input
                className={inputCls}
                value={form.footerText}
                onChange={(e) => patch({ footerText: e.target.value })}
              />
            </div>
          </section>

          {/* e) Botões */}
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Botões
            </h2>
            {form.buttons.map((b, i) => (
              <div
                key={i}
                className="space-y-2 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"
              >
                <div className="flex items-center gap-2">
                  <select
                    className={inputCls}
                    value={b.type}
                    onChange={(e) =>
                      setButton(i, { type: e.target.value as ButtonForm['type'] })
                    }
                  >
                    <option value="QUICK_REPLY">Resposta rápida</option>
                    <option value="URL">Link</option>
                    <option value="PHONE_NUMBER">Telefone</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => removeButton(i)}
                    className="rounded-md p-2 text-zinc-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"
                    aria-label="Remover botão"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <input
                  className={inputCls}
                  placeholder="Texto do botão"
                  value={b.text}
                  onChange={(e) => setButton(i, { text: e.target.value })}
                />
                {b.type === 'URL' && (
                  <input
                    className={inputCls}
                    placeholder="https://..."
                    value={b.url ?? ''}
                    onChange={(e) => setButton(i, { url: e.target.value })}
                  />
                )}
                {b.type === 'PHONE_NUMBER' && (
                  <input
                    className={inputCls}
                    placeholder="+5511999999999"
                    value={b.phone ?? ''}
                    onChange={(e) => setButton(i, { phone: e.target.value })}
                  />
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addButton}
              disabled={form.buttons.length >= 3}
              className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-zinc-300 px-3 py-2 text-xs font-medium text-zinc-600 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              <Plus className="h-3.5 w-3.5" />
              Adicionar botão
            </button>
          </section>

          {/* Rodapé de ações */}
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-zinc-200 pt-4 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => router.back()}
              className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => handleSave(false)}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Salvar rascunho
            </button>
            <button
              type="button"
              onClick={() => handleSave(true)}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-60"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Salvar e submeter
            </button>
          </div>
        </div>

        {/* Coluna direita: prévia */}
        <div className="lg:sticky lg:top-4 lg:self-start">
          <TemplatePreview form={form} />
        </div>
      </div>
    </div>
  );
}
