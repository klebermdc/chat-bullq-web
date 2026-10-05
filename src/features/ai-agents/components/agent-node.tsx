'use client';

import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Sparkles, Power, PowerOff, Users } from 'lucide-react';
import {
  type AiAgent,
  DEPARTMENT_COLORS,
} from '../services/ai-agents.service';
import { Badge } from '@/components/ui/badge';
import { departmentLabel } from './department-labels';

const AGENT_MODE_LABELS: Record<string, string> = {
  AUTONOMOUS: 'autônomo',
  COPILOT: 'copiloto',
  DISABLED: 'desativado',
};

// React Flow v12 requires node data to be assignable to Record<string,unknown>.
export type AgentNodeData = {
  agent: AiAgent;
  onClick: (agent: AiAgent) => void;
  onToggleActive: (agent: AiAgent) => void;
} & Record<string, unknown>;

/**
 * Custom React Flow node rendering an AgentCard. Identical visual to the
 * legacy grid card so users still recognize it — only difference is React
 * Flow connection handles top/bottom and a department-tinted ring/badge.
 */
function AgentNodeBase({ data }: { data: AgentNodeData }) {
  const { agent, onClick, onToggleActive } = data;
  const isOrchestrator = agent.kind === 'ORCHESTRATOR';
  const dept = agent.department && DEPARTMENT_COLORS[agent.department];

  return (
    <div className="relative">
      <Handle
        type="target"
        position={Position.Top}
        className="!h-2 !w-2 !border-border !bg-zinc-400"
      />
      <button
        onClick={() => onClick(agent)}
        className={`group w-[320px] rounded-xl border bg-card p-4 text-left shadow-soft transition-shadow hover:shadow-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
          isOrchestrator
            ? 'border-primary/40 ring-1 ring-primary/10'
            : dept
              ? `border-border ring-1 ${dept.ring}`
              : 'border-border'
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-3 min-w-0">
            <div
              className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${
                isOrchestrator
                  ? 'bg-primary/15 text-primary'
                  : dept
                    ? `${dept.bg} ${dept.text}`
                    : 'bg-primary/10 text-primary'
              }`}
            >
              <Sparkles aria-hidden="true" className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <p className="truncate font-medium text-foreground">
                  {agent.name}
                </p>
                <Badge variant={isOrchestrator ? 'brand' : 'neutral'}>
                  {isOrchestrator ? 'Orquestrador' : 'Agente'}
                </Badge>
              </div>
              <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                {agent.modelId}
              </p>
              {agent.description && (
                <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground">
                  {agent.description}
                </p>
              )}
            </div>
          </div>
          <span
            role="switch"
            tabIndex={0}
            aria-checked={agent.isActive}
            aria-label={`${agent.name}: ${agent.isActive ? 'ativo' : 'pausado'}`}
            title={agent.isActive ? 'Pausar agente' : 'Ativar agente'}
            onClick={(e) => {
              e.stopPropagation();
              onToggleActive(agent);
            }}
            onKeyDown={(e) => {
              if (e.key !== 'Enter' && e.key !== ' ') return;
              e.preventDefault();
              e.stopPropagation();
              onToggleActive(agent);
            }}
            className={`inline-flex flex-shrink-0 cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              agent.isActive
                ? 'bg-success-wash text-success-ink'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            {agent.isActive ? (
              <>
                <Power aria-hidden="true" className="h-3 w-3" /> Ativo
              </>
            ) : (
              <>
                <PowerOff aria-hidden="true" className="h-3 w-3" /> Pausado
              </>
            )}
          </span>
        </div>

        {(agent.department || agent.squad) && (
          <div className="mt-3 flex flex-wrap gap-1">
            {agent.department && (
              <span
                className={`rounded-md px-1.5 py-0.5 text-[11px] font-medium ${
                  dept
                    ? `${dept.bg} ${dept.text}`
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {departmentLabel(agent.department)}
              </span>
            )}
            {agent.squad && (
              <span className="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
                <Users aria-hidden="true" className="h-3 w-3" /> {agent.squad}
              </span>
            )}
          </div>
        )}

        {agent.channels && agent.channels.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {agent.channels.map((c) => (
              <span
                key={c.id}
                className="inline-flex items-center gap-0.5 rounded-md bg-muted px-1.5 py-0.5 text-[11px] text-foreground"
              >
                {c.channel.name}
                <span className="text-muted-foreground">· {AGENT_MODE_LABELS[c.mode] ?? c.mode}</span>
              </span>
            ))}
          </div>
        )}
      </button>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!h-2 !w-2 !border-border !bg-zinc-400"
      />
    </div>
  );
}

export const AgentNode = memo(AgentNodeBase);
