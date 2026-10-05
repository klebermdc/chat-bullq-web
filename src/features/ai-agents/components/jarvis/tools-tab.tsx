'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Wrench,
  Trash2,
  Edit2,
  Globe,
  Database,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  aiCatalogService,
  type AiTool,
} from '../../services/ai-catalog.service';
import { useOrgId } from '@/hooks/use-org-query-key';
import { ToolDialog } from './tool-dialog';
import { getErrorMessage } from '@/lib/errors';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';

export function JarvisToolsTab() {
  const orgId = useOrgId();
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<AiTool | null>(null);

  const { data: tools, isLoading } = useQuery({
    queryKey: ['ai-tools', orgId],
    queryFn: () => aiCatalogService.listTools(),
  });

  const { confirm, confirmDialog } = useConfirm();

  const refresh = () => qc.invalidateQueries({ queryKey: ['ai-tools'] });

  const handleDelete = async (tool: AiTool) => {
    const skillCount = tool._count?.skills ?? 0;
    const isConfirmed = await confirm({
      title: `Excluir a tool "${tool.name}"?`,
      description:
        skillCount > 0
          ? `${skillCount} ${skillCount === 1 ? 'skill fica' : 'skills ficam'} sem conexão e param de funcionar. Esta ação não pode ser desfeita.`
          : 'Esta ação não pode ser desfeita.',
      confirmLabel: 'Excluir',
      destructive: true,
    });
    if (!isConfirmed) return;
    try {
      await aiCatalogService.removeTool(tool.id);
      toast.success('Tool excluída');
      refresh();
    } catch (err: any) {
      toast.error(getErrorMessage(err, 'Erro ao excluir'));
    }
  };

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <Wrench aria-hidden="true" className="h-5 w-5 text-muted-foreground" />
            Tools (conexões)
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Conexões reutilizáveis: API HTTP ou Postgres. Cada skill usa uma tool
            para executar ações concretas.
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus aria-hidden="true" className="h-4 w-4" />
          Nova tool
        </Button>
      </div>

      {isLoading && (
        <div className="h-40 animate-pulse rounded-xl bg-muted" />
      )}

      {tools && tools.length === 0 && (
        <EmptyState
          icon={Wrench}
          title="Nenhuma tool cadastrada"
          description="Cadastre uma conexão HTTP (ex.: Trivapp) ou SQL (ex.: Hotwebinar) e depois crie skills que usam essa conexão."
          action={
            <Button onClick={() => setShowCreate(true)}>
              <Plus aria-hidden="true" className="h-4 w-4" /> Nova tool
            </Button>
          }
          className="rounded-xl border border-dashed border-border"
        />
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {(tools ?? []).map((tool) => {
          const isHttp = tool.source === 'CUSTOM_HTTP';
          const Icon = isHttp ? Globe : Database;
          return (
            <div
              key={tool.id}
              className="rounded-xl border border-border bg-card p-4 shadow-soft"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Icon aria-hidden="true" className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <p className="min-w-0 truncate text-sm font-semibold text-foreground">
                      {tool.name}
                    </p>
                    <Badge variant="neutral" className="font-mono font-medium">
                      {isHttp ? 'HTTP' : 'SQL'}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                    {tool.description}
                  </p>
                  {isHttp && tool.httpBaseUrl && (
                    <code className="mt-2 block truncate text-[11px] font-mono text-muted-foreground">
                      {tool.httpBaseUrl}
                    </code>
                  )}
                  {!isHttp && tool.sqlConnectionRef && (
                    <code className="mt-2 block truncate text-[11px] font-mono text-muted-foreground">
                      {`{{env.${tool.sqlConnectionRef}}}`}
                    </code>
                  )}
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    onClick={() => setEditing(tool)}
                    aria-label={`Editar ${tool.name}`}
                    title="Editar"
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Edit2 aria-hidden="true" className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(tool)}
                    aria-label={`Excluir ${tool.name}`}
                    title="Excluir"
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-urgent-wash hover:text-urgent-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {tool._count && tool._count.skills > 0 && (
                <div className="mt-3 flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Sparkles aria-hidden="true" className="h-3 w-3" />
                  <span className="tabular-nums">{tool._count.skills}</span>{' '}
                  {tool._count.skills > 1 ? 'skills usam esta tool' : 'skill usa esta tool'}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <ToolDialog
        open={showCreate}
        tool={null}
        onClose={() => setShowCreate(false)}
        onSaved={() => {
          refresh();
          setShowCreate(false);
        }}
      />
      <ToolDialog
        open={!!editing}
        tool={editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          refresh();
          setEditing(null);
        }}
      />
      {confirmDialog}
    </div>
  );
}
