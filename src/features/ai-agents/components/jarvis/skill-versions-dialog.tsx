'use client';

import { useQuery } from '@tanstack/react-query';
import { History } from 'lucide-react';
import {
  aiCatalogService,
  type AiSkill,
} from '../../services/ai-catalog.service';
import { fmtRelative } from './format';
import { Badge } from '@/components/ui/badge';
import { Dialog } from '@/components/ui/dialog';
import { EmptyState, LoadingState } from '@/components/ui/empty-state';

interface Props {
  skill: AiSkill | null;
  onClose: () => void;
}

export function SkillVersionsDialog({ skill, onClose }: Props) {
  const { data: versions } = useQuery({
    queryKey: ['ai-skill-versions', skill?.id],
    queryFn: () => aiCatalogService.listSkillVersions(skill!.id),
    enabled: !!skill,
  });

  if (!skill) return null;

  return (
    <Dialog open onClose={onClose} title={`Histórico — ${skill.name}`} size="xl">
        <div className="space-y-3">
          {versions === undefined ? (
            <LoadingState />
          ) : versions.length === 0 ? (
            <EmptyState size="sm" icon={History} title="Nenhuma versão registrada" />
          ) : (
            versions.map((v, i) => (
              <div
                key={v.id}
                className={`rounded-lg border p-3 text-sm ${
                  i === 0
                    ? 'border-primary/40 bg-primary/5'
                    : 'border-border'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="neutral" className="font-mono tabular-nums">
                      v{v.version}
                    </Badge>
                    {i === 0 && <Badge variant="success">Atual</Badge>}
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    {fmtRelative(v.createdAt)}
                  </span>
                </div>
                {v.changeNote && (
                  <p className="mt-1.5 text-xs italic text-muted-foreground">
                    “{v.changeNote}”
                  </p>
                )}
                <details className="mt-2">
                  <summary className="cursor-pointer text-[11px] text-muted-foreground hover:text-foreground">
                    Ver conteúdo desta versão
                  </summary>
                  <div className="mt-2 space-y-1 text-[11px]">
                    <div>
                      <span className="text-muted-foreground">Nome:</span>{' '}
                      <span className="text-foreground">
                        {v.name}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Categoria:</span>{' '}
                      <span className="text-foreground">
                        {v.category ?? '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Origem:</span>{' '}
                      <span className="text-foreground">
                        {v.source}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Tool:</span>{' '}
                      <span className="text-foreground">
                        {v.toolId ?? '—'}
                      </span>
                    </div>
                    {v.source === 'HTTP' && v.httpPath && (
                      <div>
                        <span className="text-muted-foreground">HTTP:</span>{' '}
                        <code className="font-mono text-foreground">
                          {v.httpMethod} {v.httpPath}
                        </code>
                      </div>
                    )}
                    {v.source === 'SQL' && v.sqlQuery && (
                      <div>
                        <span className="text-muted-foreground">SQL:</span>
                        <pre className="mt-1 max-h-32 overflow-auto rounded bg-muted p-2 font-mono text-[11px]">
                          {v.sqlQuery}
                        </pre>
                      </div>
                    )}
                    {v.promptInstructions && (
                      <div>
                        <span className="text-muted-foreground">Prompt:</span>
                        <pre className="mt-1 max-h-40 overflow-auto rounded bg-muted p-2 font-mono text-[11px]">
                          {v.promptInstructions}
                        </pre>
                      </div>
                    )}
                  </div>
                </details>
              </div>
            ))
          )}
        </div>
    </Dialog>
  );
}
