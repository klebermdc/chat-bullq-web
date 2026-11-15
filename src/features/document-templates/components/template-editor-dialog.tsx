'use client';

import { useEffect, useId, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { controlCls } from '@/components/ui/control';
import { Dialog } from '@/components/ui/dialog';
import { LoadingState } from '@/components/ui/empty-state';
import { useOrgId } from '@/hooks/use-org-query-key';
import { getErrorMessage } from '@/lib/errors';
import { cn } from '@/lib/utils';
import { documentTemplatesKeys, useDocumentTemplate } from '../hooks/use-document-templates';
import { extractPlaceholders, placeholderLabel } from '../lib/placeholders';
import { documentTemplatesService } from '../services/document-templates.service';
import type { DocumentTemplateInput, TemplateAudience } from '../types';
import { AUDIENCE_LABEL } from './audience-label';

interface TemplateEditorDialogProps {
  open: boolean;
  onClose: () => void;
  /** Nulo = novo modelo. */
  templateId: string | null;
  defaultAudience: TemplateAudience;
  categories: readonly string[];
}

const TITLE_MAX = 120;
const CATEGORY_MAX = 60;
const BODY_ROWS = 14;
const EMPTY_FORM: DocumentTemplateInput = { title: '', category: null, audience: 'CLIENT', body: '' };

/** Criar ou editar um modelo, com os campos detectados no texto ao vivo. */
export function TemplateEditorDialog({ open, onClose, templateId, defaultAudience, categories }: TemplateEditorDialogProps) {
  const ids = useId();
  const orgId = useOrgId();
  const queryClient = useQueryClient();
  const detail = useDocumentTemplate(open ? templateId : null);
  const [form, setForm] = useState<DocumentTemplateInput>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Abriu: começa limpo. O texto salvo entra uma vez só por abertura, para
  // que uma recarga em segundo plano não apague o que está sendo editado.
  const [loadedId, setLoadedId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setLoadedId(null);
      return;
    }
    setIsDirty(false);
    if (!templateId) setForm({ ...EMPTY_FORM, audience: defaultAudience });
  }, [open, templateId, defaultAudience]);

  useEffect(() => {
    if (!open || !templateId || !detail.data || loadedId === templateId) return;
    const { title, category, audience, body } = detail.data;
    setForm({ title, category, audience, body });
    setLoadedId(templateId);
  }, [open, templateId, detail.data, loadedId]);

  const placeholders = useMemo(() => extractPlaceholders(form.body), [form.body]);
  const canSave = form.title.trim().length > 0 && form.body.trim().length > 0 && !isSaving;

  function update<K extends keyof DocumentTemplateInput>(key: K, value: DocumentTemplateInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setIsDirty(true);
  }

  async function save() {
    if (!canSave) return;
    setIsSaving(true);
    const payload: DocumentTemplateInput = {
      ...form,
      title: form.title.trim(),
      category: form.category?.trim() || null,
    };
    try {
      if (templateId) await documentTemplatesService.update(templateId, payload);
      else await documentTemplatesService.create(payload);
      await queryClient.invalidateQueries({ queryKey: documentTemplatesKeys.all(orgId) });
      toast.success(templateId ? 'Modelo atualizado.' : 'Modelo criado.');
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Não foi possível salvar o modelo.'));
    } finally {
      setIsSaving(false);
    }
  }

  const isLoadingDetail = !!templateId && detail.isLoading;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={templateId ? 'Editar modelo' : 'Novo modelo'}
      description="Escreva os campos entre colchetes, ex.: [Nome do Cliente]."
      size="2xl"
      dismissible={!isDirty}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isSaving}>Cancelar</Button>
          <Button onClick={save} loading={isSaving} disabled={!canSave}>Salvar</Button>
        </>
      }
    >
      {isLoadingDetail ? (
        <LoadingState label="Carregando o modelo…" />
      ) : detail.isError && templateId ? (
        <p role="alert" className="py-6 text-center text-sm">{getErrorMessage(detail.error, 'Não foi possível carregar o modelo.')}</p>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor={`${ids}-title`} className="text-sm font-medium text-foreground">Título</label>
              <input id={`${ids}-title`} value={form.title} maxLength={TITLE_MAX} required
                onChange={(e) => update('title', e.target.value)} className={cn(controlCls, 'w-full')} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor={`${ids}-category`} className="text-sm font-medium text-foreground">Categoria</label>
              <input id={`${ids}-category`} value={form.category ?? ''} maxLength={CATEGORY_MAX} list={`${ids}-categories`}
                placeholder="Ex.: Pacotes" onChange={(e) => update('category', e.target.value)} className={cn(controlCls, 'w-full')} />
              <datalist id={`${ids}-categories`}>
                {categories.map((c) => <option key={c} value={c} />)}
              </datalist>
            </div>
          </div>

          <fieldset className="space-y-1.5">
            <legend className="text-sm font-medium text-foreground">Para quem</legend>
            <div className="flex flex-wrap gap-4 text-sm">
              {(Object.keys(AUDIENCE_LABEL) as TemplateAudience[]).map((audience) => (
                <label key={audience} className="inline-flex items-center gap-2">
                  <input type="radio" name={`${ids}-audience`} value={audience} checked={form.audience === audience}
                    onChange={() => update('audience', audience)} className="accent-primary" />
                  {AUDIENCE_LABEL[audience].long}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="space-y-1.5">
            <label htmlFor={`${ids}-body`} className="text-sm font-medium text-foreground">Texto do documento</label>
            <textarea id={`${ids}-body`} value={form.body} rows={BODY_ROWS} required
              onChange={(e) => update('body', e.target.value)}
              className={cn(controlCls.replace('h-9', 'min-h-[16rem] py-2'), 'w-full resize-y leading-relaxed')} />
          </div>

          <div aria-live="polite">
            <p className="text-xs font-medium text-muted-foreground">
              {placeholders.length === 0 ? 'Nenhum campo detectado.' : `Campos detectados (${placeholders.length}):`}
            </p>
            {placeholders.length > 0 && (
              <ul className="mt-1.5 flex flex-wrap gap-1.5">
                {placeholders.map((p) => (
                  <li key={p} className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    {placeholderLabel(p)}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </Dialog>
  );
}
