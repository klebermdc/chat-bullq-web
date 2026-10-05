'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Sparkles,
  Trash2,
  Edit2,
  History,
  Bot,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  aiCatalogService,
  type AiSkill,
} from '../../services/ai-catalog.service';
import { useOrgId } from '@/hooks/use-org-query-key';
import { SkillDialog } from './skill-dialog';
import { SkillVersionsDialog } from './skill-versions-dialog';
import { getErrorMessage } from '@/lib/errors';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';

export function JarvisSkillsTab() {
  const orgId = useOrgId();
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<AiSkill | null>(null);
  const [versions, setVersions] = useState<AiSkill | null>(null);

  const { data: skills, isLoading } = useQuery({
    queryKey: ['ai-skills', orgId],
    queryFn: () => aiCatalogService.listSkills(),
  });

  const { confirm, confirmDialog } = useConfirm();

  const refresh = () => qc.invalidateQueries({ queryKey: ['ai-skills'] });

  const handleDelete = async (skill: AiSkill) => {
    const agentCount = skill._count?.agents ?? 0;
    const isConfirmed = await confirm({
      title: `Excluir a skill "${skill.name}"?`,
      description:
        agentCount > 0
          ? `${agentCount} ${agentCount === 1 ? 'agente perde' : 'agentes perdem'} esta capacidade. Esta ação não pode ser desfeita.`
          : 'Esta ação não pode ser desfeita.',
      confirmLabel: 'Excluir',
      destructive: true,
    });
    if (!isConfirmed) return;
    try {
      await aiCatalogService.removeSkill(skill.id);
      toast.success('Skill excluída');
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
            <Sparkles aria-hidden="true" className="h-5 w-5 text-muted-foreground" />
            Skills
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Pacotes reutilizáveis de tool + instruções. Atribua a um agente para
            ele ganhar a capacidade.
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus aria-hidden="true" className="h-4 w-4" />
          Nova skill
        </Button>
      </div>

      {isLoading && (
        <div className="h-40 animate-pulse rounded-xl bg-muted" />
      )}

      {skills && skills.length === 0 && (
        <EmptyState
          icon={Sparkles}
          title="Nenhuma skill cadastrada"
          description="Crie skills para empacotar tool + instruções e reutilizar entre agentes. Ex.: “Liberação de acesso”, com a tool unlockCourseAccess e um prompt dizendo quando usar."
          action={
            <Button onClick={() => setShowCreate(true)}>
              <Plus aria-hidden="true" className="h-4 w-4" /> Nova skill
            </Button>
          }
          className="rounded-xl border border-dashed border-border"
        />
      )}

      <div className="grid gap-3 lg:grid-cols-2">
        {(skills ?? []).map((skill) => (
          <div
            key={skill.id}
            className="rounded-xl border border-border bg-card p-4 shadow-soft"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="min-w-0 truncate text-sm font-semibold text-foreground">
                    {skill.name}
                  </p>
                  {skill.category && (
                    <Badge variant="neutral" className="font-medium">{skill.category}</Badge>
                  )}
                  <Badge variant="neutral" className="font-mono tabular-nums">
                    v{skill.currentVersion}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                  {skill.description}
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <button
                  type="button"
                  onClick={() => setVersions(skill)}
                  aria-label={`Histórico de versões de ${skill.name}`}
                  title="Histórico de versões"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <History aria-hidden="true" className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(skill)}
                  aria-label={`Editar ${skill.name}`}
                  title="Editar"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Edit2 aria-hidden="true" className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(skill)}
                  aria-label={`Excluir ${skill.name}`}
                  title="Excluir"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-urgent-wash hover:text-urgent-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] tabular-nums text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Bot aria-hidden="true" className="h-3 w-3" /> {skill._count?.agents ?? 0}{' '}
                {(skill._count?.agents ?? 0) === 1 ? 'agente' : 'agentes'}
              </span>
              <span className="inline-flex items-center gap-1">
                <History aria-hidden="true" className="h-3 w-3" /> {skill._count?.versions ?? 0}{' '}
                {(skill._count?.versions ?? 0) === 1 ? 'versão' : 'versões'}
              </span>
            </div>

            {skill.tool && (
              <div className="mt-2 flex flex-wrap items-center gap-1">
                <span className="text-[11px] text-muted-foreground">via</span>
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-foreground">
                  {skill.tool.name}
                </code>
                <Badge variant="neutral" className="font-mono font-medium">{skill.source}</Badge>
              </div>
            )}
          </div>
        ))}
      </div>

      <SkillDialog
        open={showCreate}
        skill={null}
        onClose={() => setShowCreate(false)}
        onSaved={() => {
          refresh();
          setShowCreate(false);
        }}
      />
      <SkillDialog
        open={!!editing}
        skill={editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          refresh();
          setEditing(null);
        }}
      />
      <SkillVersionsDialog
        skill={versions}
        onClose={() => setVersions(null)}
      />
      {confirmDialog}
    </div>
  );
}
