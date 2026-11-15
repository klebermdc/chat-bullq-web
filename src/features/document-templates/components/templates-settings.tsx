'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { FileDown, FileText, Pencil, Plus, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { EmptyState, LoadingState } from '@/components/ui/empty-state';
import { Switch } from '@/components/ui/switch';
import { SettingsPageHeader } from '@/features/settings/components/settings-page-header';
import { useOrgId } from '@/hooks/use-org-query-key';
import { getErrorMessage } from '@/lib/errors';
import { useIsOrgManager } from '@/lib/permissions';
import { cn } from '@/lib/utils';
import { documentTemplatesKeys, useDocumentTemplates } from '../hooks/use-document-templates';
import { groupByCategory, listCategories } from '../lib/template-catalog';
import { documentTemplatesService } from '../services/document-templates.service';
import type { DocumentTemplateSummary, TemplateAudience } from '../types';
import { AgencyDefaultsCard } from './agency-defaults-card';
import { AUDIENCE_LABEL } from './audience-label';
import { FillPdfDialog } from './fill-pdf-dialog';
import { TemplateEditorDialog } from './template-editor-dialog';

const TABS: readonly TemplateAudience[] = ['CLIENT', 'INTERNAL'];

const iconBtnCls =
  'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors ' +
  'hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

type EditorState = { open: false } | { open: true; templateId: string | null };

interface TemplateRowProps {
  template: DocumentTemplateSummary;
  onEdit: () => void;
  onFill: () => void;
}

function TemplateRow({ template, onEdit, onFill }: TemplateRowProps) {
  const orgId = useOrgId();
  const queryClient = useQueryClient();
  const [isToggling, setIsToggling] = useState(false);

  async function toggleActive(isActive: boolean) {
    setIsToggling(true);
    try {
      await documentTemplatesService.update(template.id, { isActive });
      await queryClient.invalidateQueries({ queryKey: documentTemplatesKeys.all(orgId) });
      toast.success(isActive ? 'Modelo ativado.' : 'Modelo desativado.');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Não foi possível alterar o modelo.'));
    } finally {
      setIsToggling(false);
    }
  }

  const fieldsCount = template.placeholders.length === 1 ? '1 campo' : `${template.placeholders.length} campos`;

  return (
    <li className="flex flex-wrap items-center gap-3 px-4 py-3 sm:flex-nowrap">
      <div className={cn('min-w-0 flex-1', !template.isActive && 'opacity-60')}>
        <p className="truncate text-sm font-medium text-foreground">{template.title}</p>
        <p className="text-xs text-muted-foreground">
          {fieldsCount}
          {!template.isActive && ' · inativo'}
        </p>
      </div>
      <div className="flex items-center gap-1">
        <button type="button" onClick={onFill} className={iconBtnCls} aria-label={`Preencher e baixar PDF de ${template.title}`} title="Preencher e baixar PDF">
          <FileDown aria-hidden="true" className="h-4 w-4" />
        </button>
        <button type="button" onClick={onEdit} className={iconBtnCls} aria-label={`Editar ${template.title}`} title="Editar">
          <Pencil aria-hidden="true" className="h-4 w-4" />
        </button>
        <Switch
          size="sm"
          className="ml-1"
          checked={template.isActive}
          disabled={isToggling}
          onChange={toggleActive}
          label={template.isActive ? `Desativar ${template.title}` : `Ativar ${template.title}`}
        />
      </div>
    </li>
  );
}

/** Tela "Modelos de documentos" (dono/administrador). */
export function TemplatesSettings() {
  const isManager = useIsOrgManager();
  const [audience, setAudience] = useState<TemplateAudience>('CLIENT');
  const [editor, setEditor] = useState<EditorState>({ open: false });
  const [fillId, setFillId] = useState<string | null>(null);
  const { data: templates = [], isLoading, isError, error } = useDocumentTemplates(audience, {
    includeInactive: true,
    enabled: isManager,
  });
  const allCategories = listCategories(templates);

  if (!isManager) {
    return (
      <EmptyState icon={ShieldAlert} title="Acesso restrito" description="Só o dono ou um administrador gerencia os modelos de documentos." />
    );
  }

  return (
    <div className="space-y-5">
      <SettingsPageHeader
        title="Modelos de documentos"
        description="Contratos que o cliente assina pelo link e documentos internos para baixar em PDF. Campos entre colchetes, ex.: [Nome do Cliente]."
        action={
          <Button onClick={() => setEditor({ open: true, templateId: null })}>
            <Plus aria-hidden="true" className="h-4 w-4" /> Novo modelo
          </Button>
        }
      />

      <AgencyDefaultsCard />

      <div role="tablist" aria-label="Tipo de modelo" className="flex gap-1 border-b border-border">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={audience === tab}
            onClick={() => setAudience(tab)}
            className={cn(
              '-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              audience === tab ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {AUDIENCE_LABEL[tab].short}
          </button>
        ))}
      </div>

      <div role="tabpanel" aria-label={AUDIENCE_LABEL[audience].short}>
        {isLoading ? (
          <LoadingState />
        ) : isError ? (
          <p role="alert" className="py-10 text-center text-sm">{getErrorMessage(error, 'Não foi possível carregar os modelos.')}</p>
        ) : templates.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="Nenhum modelo ainda"
            description={audience === 'CLIENT' ? 'Crie o primeiro contrato para enviar aos clientes.' : 'Crie o primeiro documento interno.'}
          />
        ) : (
          <div className="space-y-5">
            {groupByCategory(templates).map((group) => (
              <section key={group.category} aria-label={group.category}>
                <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{group.category}</h3>
                <ul className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border bg-card shadow-soft">
                  {group.templates.map((t) => (
                    <TemplateRow
                      key={t.id}
                      template={t}
                      onEdit={() => setEditor({ open: true, templateId: t.id })}
                      onFill={() => setFillId(t.id)}
                    />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>

      {editor.open && (
        <TemplateEditorDialog
          templateId={editor.templateId}
          defaultAudience={audience}
          categories={allCategories}
          onClose={() => setEditor({ open: false })}
        />
      )}
      {fillId && <FillPdfDialog templateId={fillId} onClose={() => setFillId(null)} />}
    </div>
  );
}
